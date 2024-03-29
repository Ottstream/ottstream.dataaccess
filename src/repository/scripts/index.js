const clientsRepo = require('../client/client.repository');
const subscriptionRepo = require('../subscription/subscription.repository');
const clientLocationRepo = require('../client/client_location.repository');
const invoiceRepo = require('../payment/invoice.repository')
const moment = require('moment')
const logger = require('../../utils/logger/logger');
const { Types } = require('mongoose');

const dateUpdate = async () => {
    console.time('script')
    // const clientIdList = ['647898c94a7b10c3f93e1d65',
    // '647898c94a7b10c3f93e1d65',
    // '647899564a7b10c3f940818d',
    // '647898ee4a7b10c3f93ec291',
    // '6478996a4a7b10c3f940f39a',
    // '647899764a7b10c3f94134bc',
    // '6479b483a9767697cfd1f85b',
    // '6478997a4a7b10c3f9414cad']
    const clientIdList = [
        // '65a593a7e6e88d5a1fa337de',
        // '658e0282504546ca3086d769',
        // '647899944a7b10c3f941b8df',
        // '647899664a7b10c3f940d909',
        // '647899c24a7b10c3f94270a7'
    ]
    // const clientsList = await clientsRepo.getAll({ _id: { $in: clientIdList } })
    // let next = true
    // let page = 1, limit = 100
    // while (next) {
    const clientsList = await clientsRepo.getAll({})
    // if (!clientsList = await clientsRepo.getAll().length) next = false
    let count = 0, subscrioptionCount = 0
    for (let i = 0; i < clientsList.length; i++) {
        const client = clientsList[i];

        const calculatedPackages = []

        const list = await subscriptionRepo.getALl({
            client: client._id
        });
        subscrioptionCount+=list.length
        const locationsMap = new Map()
        for (let c = 0; c < list.length; c++) {
            const clientSubscription = list[c];

            if (c === list.length -2) {
                console.log('last');
            }

            if (clientSubscription.location && !calculatedPackages.includes(clientSubscription.package.toString())) { //! if location was't deleted!

            let subscriptionDuration = 1;

            let invoice = clientSubscription.invoice || await invoiceRepo.getLast(
                {
                    "payloadCalculated.locations.locationId": clientSubscription.location?._id.toString(),
                    $or: [
                        { "payloadCalculated.equipment.equipments": { "$exists": false } },
                        { "payloadCalculated.equipment.equipments": { "$size": 0 } }
                      ],
                    payloadCalculated: { $ne: true },
                    isShipping: { $ne: true }
                }
            );
            
            // clientSubscription.invoice
            if (invoice) {
            calculatedPackages.push(clientSubscription.package.toString())
            

            let invoiceLocation = null
            // if (!invoice) {
            //     invoice = await invoiceRepo.getLast({
            //         location: clientSubscription.location
            //     })
            // }

            const getSubscriptionDuration = () => {
                let dur = 1
                const index = invoice.payloadCalculated.locations.findIndex(a => a.locationId = clientSubscription.location)
                if (index > -1) {
                    dur = invoice.payloadCalculated.locations[index].month || invoice.payloadCalculated.locations[index].day / 30
                    invoiceLocation = invoice.payloadCalculated.locations[index]
                }
                return dur
            }


            subscriptionDuration = getSubscriptionDuration() //! corrct duration
            // const invoiceLocationIndex = invoice.payloadCalculated?.locations?.findIndex(a => a.locationId = clientSubscription.location)
            // if (invoiceLocationIndex > -1) {
            //     subscriptionDuration = invoice.payloadCalculated.locations[invoiceLocationIndex].month
            // }
            
            const getStartDate = () => {
                let date
                if (invoiceLocation) {
                    const packageIndex = invoiceLocation.packages.findIndex(i => i.packageId === clientSubscription.package.toString())
                    if (packageIndex > -1) {
                        date = invoiceLocation.packages[packageIndex].startDate
                    }
                }

                if (!date) date = invoice.createdAt

                date = moment.utc(date)
                date.set({
                    hour: 0,
                    minute: 0
                  })
                return date
            }
            
            // const subscriptionStartDate = clientSubscription.invoice?.createdAt || clientSubscription.createdAt;
            const subscriptionStartDate = getStartDate(); //! correct start date

            const calculateEndDate = () => {
                let start, end

                if (invoice && invoiceLocation) {
                    invoiceLocation.packages.forEach(item => {
                        if (item.expireNew) {
                            if (!end) end = item.expireNew
                            else if (moment(end).isBefore(item.expireNew)) end = item.expireNew
                        } else if (item.expireDate) {
                            if (!end) end = item.expireDate
                            else if (moment(end).isBefore(item.expireDate)) end = item.expireDate
                        }
                    })
                }

                logger.info(client._id)
                logger.info(`${client.personalInfo.firstname} ${client.personalInfo.lastname}`)
                if (!end) {
                    start = moment(subscriptionStartDate)
                    end = start.add(subscriptionDuration, 'months')
                }

                return moment.utc(end)
            }

            const subscriptionEndDate = calculateEndDate(); //! correct end date

            let lastSubscription;

            const getSubscriptionState = () => {
                let status = 2 
                console.log(`Moment utc now ${moment()}`);
                const isValidRange = moment().isBetween(subscriptionStartDate, subscriptionEndDate)
                const invoiceLocationPackageIndex = invoiceLocation.packages.findIndex(x => x.packageId === clientSubscription.package.toString())
                if (invoiceLocationPackageIndex > -1 && invoiceLocation.packages[invoiceLocationPackageIndex].canceled) {
                    status = 2
                } else if (isValidRange) {
                    console.log(clientSubscription._id.toString());
                    status = 1
                } else {
                    if (c + 1 === list.length && list.length > 1) {
                        lastSubscription = list[c - 1]
                        console.log(moment.utc(lastSubscription?._doc?.endDate));
                        if (moment(subscriptionStartDate).isBefore(moment.utc(lastSubscription._doc?.endDate))) {
                            status = lastSubscription._doc.state
                        }
                    }
                }
                return status
            }
            
            
            let subscriptionState = getSubscriptionState(); //! correct state


            const isInDateRage = (date) => {
                return moment(date).isAfter(moment(subscriptionStartDate)) && moment(date).isBefore(moment(subscriptionEndDate))
            }


            logger.info('-------------------------------------------');
            logger.info(`subscription start Date is ${moment(subscriptionStartDate)}`);
            logger.info(`Invalid end date is ${clientSubscription.endDate}`);
            logger.info(`Valid end date is ${subscriptionEndDate}`);

            const subscriptionActivationDate1 = clientSubscription._doc?.location?._doc.subscriptionActivationDate;
            const subscriptionActivationDate = clientSubscription._doc?.location?._doc?.subscriptionActivationDate 
                || clientSubscription._doc?.location?._doc?.lastActiveTime
                || client._doc.subscriptionActivationDate || null;

            //? witch one is real data
            console.log(`Location activation date by Location ${moment(subscriptionActivationDate1).format()}`);
            console.log(`Location activation date by Client ${moment(subscriptionActivationDate).format()}`);

            if (clientSubscription._id.toString() === '65d2effe425d9e85b393d5ca') {
                console.log('aaaaaa');
            }

            if (subscriptionActivationDate) {

                if (clientSubscription._doc?.location && clientSubscription._doc?.location.subscriptionState !== 3) {
                    client.subscriptionState = 3; //? update client to subscription state like location
                    clientSubscription._doc.location.subscriptionState = 3; //! active if subscription is active
                }

                // if (moment(subscriptionActivationDate).isAfter(moment(subscriptionStartDate)) 
                //     && moment(subscriptionActivationDate).isBefore(subscriptionEndDate)) {
                //     logger.info('Subscription must be active');
                //     if (clientSubscription._doc?.location && clientSubscription._doc?.location.subscriptionState !== 3) {
                //         client.subscriptionState = 3; //? update client to subscription state like location
                //         clientSubscription._doc.location.subscriptionState = 3; //! active if subscription is active
                //     }
                // } else {
                //     // clientSubscription.state = 2; //! active because dates doesnt expire
                //     if (clientSubscription._doc?.location) {
                //         if (subscriptionState === 1) { //! is active
                //             client.subscriptionState = 3; //? update client to subscription state like location
                //             clientSubscription._doc.location.subscriptionState = 3; //! pending
                //         } else {
                //             client.subscriptionState = 0; //? update client to subscription state like location
                //             clientSubscription._doc.location.subscriptionState = 0; //! inactive because subscription is not valid, expired
                //         }
                //     }
                // }

                //! if cancel and acitvation is available
                if (clientSubscription._doc?.location?._doc.subscriptionCancelDate) {

                    if (isInDateRage(clientSubscription._doc.location._doc.subscriptionCancelDate)) {
                        if (moment(clientSubscription._doc.location._doc.subscriptionCancelDate).isAfter(moment(subscriptionActivationDate))) {
                            clientSubscription._doc.location.subscriptionState = 2; //! canceled
                            client.subscriptionState = 2; //? update client to subscription state like location
                        }                       
                    }
    
                }


            } else {
                if (clientSubscription.location) { 

                    if (clientSubscription._doc?.location?._doc.subscriptionCancelDate) {

                        if (isInDateRage(clientSubscription._doc.location._doc.subscriptionCancelDate)) {
                            clientSubscription.location.subscriptionState = 2; //! canceled
                            client.subscriptionState = 2; //? update client to subscription state like location
                        }
                    } else {
                        client.subscriptionState = 1; //? update client to subscription state like location
                        clientSubscription.location.subscriptionState = 1; //! pending because activation date is undefined
                    }

                };
            }

            //! panding date owerriding
            // let location = !clientSubscription._doc?.location

            // if (location) {
            //     if (location.recurringPayment) {
            //         if (location.subscriptionPendingDate) {
            //             if (!isInDateRage(location.subscriptionPendingDate)) {
            //                 location.subscriptionPendingDate = subscriptionStartDate
            //                 client.subscriptionPendingDate = subscriptionStartDate
            //             }
            //         }
            //     }
            // }

            //!

            if (clientSubscription.location?.subscriptionState === 3) {
                if (subscriptionState === 1) clientSubscription.isActive = true
                if (subscriptionState === 2) clientSubscription.isActive = false
            }

            clientSubscription.state = subscriptionState
            clientSubscription.startDate = new Date(subscriptionStartDate);
            clientSubscription.endDate = new Date(subscriptionEndDate);

            if (clientSubscription.location) {
                locationsMap.set(clientSubscription.location._id.toString(), 1)
            }

            await Promise.all([
                clientSubscription.location?.save(),
                clientSubscription.save(),
                client.save()
            ])
            count++
            logger.info('-------------------------------------------')
            // const subscriptionActivationDate = clientSubscription.location.
        };
        } else {
            clientSubscription.state = 2
            clientSubscription.save()
        }
    }



    }
    console.log(`Done ${count} of ${subscrioptionCount}`);
    // console.log(`${page * limit} done`)
    // page++

    const nextScript = new Promise((res, rej) => res(locationsUpdate()))

    nextScript.then(data => clientsUpdate())


    console.timeEnd('script')
    // locationsUpdate()
    // clientsUpdate()
}

const invoiceUpdate = async () => {
    const idList = [
        '6478996a4a7b10c3f940f2a1'
    ]
    const clients = await clientsRepo.getAll({ _id: { $in: idList } })
    // const clients = await clientsRepo.getAll({}, 100, 1)

    for (let index = 0; index < clients.length; index++) {
        const item = clients[index];
        const locations = await clientLocationRepo.getClientLocationByClientId(item._id)
        if (locations.length) {
            for (let locIndex = 0; locIndex < locations.length; locIndex++) {
                const location = locations[locIndex];
                const invoices = await invoiceRepo.getListBySortAndLimit({
                    "payloadCalculated.locations.locationId": location?._id.toString(),
                }, 2)

                if (invoices.length > 1) {
                    const current = invoices[0]
                    const prev = invoices[1]

                    const prevEndDate = null
                    console.log('current', current._id.toString());
                    console.log('prev', prev._id.toString());
                    const currentDuration = current.payloadCalculated.locations[0].month || current.payloadCalculated.locations[0].day / 30
                    
                    const validStartDate = moment(prevEndDate).add(currentDuration, 'months');
                    
                    const startDate = current.payloadCalculated.locations[0].packages[0].startDate || current.startDate
                    const endDate = current.payloadCalculated.locations[0].packages[0].expireDate || current.expireNew

                    const currentEndDate = moment(validStartDate).add(currentDuration, 'months')

                    console.log([item._id.toString()]);
                    console.table([
                        ['state', 'duration', 'start', 'end'],
                        [0, currentDuration, moment(startDate), moment(endDate)],
                        [0, currentDuration, moment(prevEndDate), moment(endDate)],
                        [1, currentDuration, validStartDate, prevEndDate],
                     ])


                } else console.log(`Location ${location._id.toString()} has only one invoice`);
                
            }
        } else console.log(`${item._id.toString()} has 0 locations`);
    }
        

}

const locationsUpdate = async () => {

    const idList = ["6478995e4a7b10c3f940abf3"]
    const filter = {
        clinetId: "6478995e4a7b10c3f940abf3"
    }
    
    // const locations = await clientLocationRepo.getClientLocationByClientId("6478996b4a7b10c3f940f7d2")
    const locations = await clientLocationRepo.getAll()

    for (let i = 0; i < locations.length; i++) {
        const location = locations[i];

        const [active, pending, inactive] = await Promise.all([
            subscriptionRepo.getALl({
                location: location._id,
                state: 1,
                isActive: true
            }),
            subscriptionRepo.getALl({
                location: location._id,
                state: 1,
                isActive: false
            }),
            subscriptionRepo.getALl({
                location: location._id,
                state: 2
            })
        ])
        let state = null
        console.log(`Old state is ${location._doc.subscriptionState}`);

        if (active.length) state = 3
        else if (inactive.length) state = 0
        else if (pending.length) state = 1
        else state = 0
        location.subcriptionState = state
        await clientLocationRepo.update({ _id: location._id }, { subscriptionState: state })
        console.log(`New state is ${location.subcriptionState}`);


    }

}

const clientsUpdate = async () => {
    const filter = {
        // _id: "646be902e6f47dfd554aad74"
    }

    const clientsList = await clientsRepo.getAll(filter)

    for (let i = 0; i < clientsList.length; i++) {
        const client = clientsList[i];
        
        const locations = await clientLocationRepo.getClientLocationByClientId(client._id)
        let states = {
            0: 0,
            1: 0,
            2: 0,
            3: 0
        }
        locations.forEach(x => states[x._doc.subscriptionState]++)
        let state = null
        if (states[3] > 0) state = 3
        else if (states[0] > 0) state = 0
        else if (states[1] > 0) state = 1
        else state = 0

        console.log(`client Old state is ${client._doc.subscriptionState}`);
        console.log(`client New state is ${state}`);
        await clientsRepo.updateAll({ _id: client._id }, { subscriptionState: state })
    }
}

module.exports = {
    run: dateUpdate
}