const clientsRepo = require('../client/client.repository');
const subscriptionRepo = require('../subscription/subscription.repository');
const clientLocationRepo = require('../client/client_location.repository');
const invoiceRepo = require('../payment/invoice.repository')
const moment = require('moment')
const logger = require('../../utils/logger/logger');
const { Types } = require('mongoose');

const dateUpdate = async () => {
    console.time('script')

    const clientIdList = [
        '6478999d4a7b10c3f941ea79'
    ]
    const clientsList = await clientsRepo.getAll({ _id: { $in: clientIdList } })
    // const clientsList = await clientsRepo.getAll({})
    let count = 0, subscrioptionCount = 0
    for (let i = 0; i < clientsList.length; i++) {
        const client = clientsList[i];

        let calculatedPackages = {}

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

            if (clientSubscription.location 
                // && (clientSubscription.returnInvoice || clientSubscription.invoice) 
                && (!calculatedPackages[clientSubscription.location._id.toString()] || !calculatedPackages[clientSubscription.location?._id.toString()].includes(clientSubscription.package.toString()))) { //! if location was't deleted!

            let subscriptionDuration = 1;

            let invoice = clientSubscription.returnInvoice || clientSubscription.invoice || await invoiceRepo.getLast(
                {
                    "payloadCalculated.locations.locationId": clientSubscription.location?._id.toString(),
                    $or: [
                        { "payloadCalculated.equipment.equipments": { "$exists": false } },
                        { "payloadCalculated.equipment.equipments": { "$size": 0 } }
                      ],
                    isShipping: { $ne: true },
                }
            );
            
            // clientSubscription.invoice
            if (invoice) {
                if (!calculatedPackages[clientSubscription.location._id.toString()]) calculatedPackages[clientSubscription.location._id.toString()] = []
                else calculatedPackages[clientSubscription.location._id.toString()].push(clientSubscription.package.toString())
            
            console.log(`${i} from ${clientsList.length}`);
            let invoiceLocation = null

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
            
            const subscriptionStartDate = getStartDate(); //! correct start date

            const calculateEndDate = () => {
                let start, end

                if (invoice && invoiceLocation) {
                    invoiceLocation.packages.forEach(item => {
                        if (invoice.payed && invoice.payed > 0) {
                            if (item.expireNew) {
                                if (!end) end = item.expireNew
                                else if (moment(end).isBefore(item.expireNew)) end = item.expireNew
                            }
                        } else {
                            if (item.expireDate) {
                                if (!end) end = item.expireDate
                                else if (moment(end).isBefore(item.expireDate)) end = item.expireDate
                            }
                        }
                        // if (item.expireNew) {
                        //     if (!end) end = item.expireNew
                        //     else if (moment(end).isBefore(item.expireNew)) end = item.expireNew
                        // } else if (item.expireDate) {
                        //     if (!end) end = item.expireDate
                        //     else if (moment(end).isBefore(item.expireDate)) end = item.expireDate
                        // }
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
            let isCanceledSubscription = false;

            const getSubscriptionState = () => {
                let status = 2 
                console.log(`Moment utc now ${moment()}`);

                const isValidRange = moment().isBetween(subscriptionStartDate, subscriptionEndDate)
                const invoiceLocationPackageIndex = invoiceLocation.packages.findIndex(x => x.packageId === clientSubscription.package.toString())
                if (invoiceLocationPackageIndex > -1 && invoiceLocation.packages[invoiceLocationPackageIndex].canceled) {
                    status = 2
                    isCanceledSubscription = true;
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

            const subscriptionActivationDate = clientSubscription._doc?.location?._doc?.subscriptionActivationDate 
                || clientSubscription._doc?.location?._doc?.lastActiveTime
                || client._doc.subscriptionActivationDate || null;

            if (isCanceledSubscription) {

                client.subscriptionState = 2; //! cancel
                clientSubscription._doc.location.subscriptionState = 2; //! cancel

            } else if (subscriptionActivationDate) {

                if (clientSubscription._doc?.location && clientSubscription._doc?.location.subscriptionState !== 3) {
                    client.subscriptionState = 3; //? update client to subscription state like location
                    clientSubscription._doc.location.subscriptionState = 3; //! active if subscription is active
                }
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

    // const nextScript = new Promise((res, rej) => res(locationsUpdate()))

    // nextScript.then(data => clientsUpdate())


    console.timeEnd('script')
    // locationsUpdate()
    // clientsUpdate()
}

const invoiceUpdate = async () => {
    const idList = [
        '6478999d4a7b10c3f941ea79'
    ]
    // const clients = await clientsRepo.getAll({ _id: { $in: idList } })
    const clients = await clientsRepo.getAll({})
    console.time('invoice')
    for (let index = 0; index < clients.length; index++) {
        const item = clients[index];
        const locations = await clientLocationRepo.getClientLocationByClientId(item._id)
        if (locations.length) {
            for (let locIndex = 0; locIndex < locations.length; locIndex++) {
                const location = locations[locIndex];
                const invoices = await invoiceRepo.getListBySortAndLimit({
                    location: location?._id,
                    payed: { $exists: true, $gt: 0 }
                }, 2)

                if (invoices.length > 1) {
                    const current = invoices[0]
                    const prev = invoices[1]

                    if (current.payloadCalculated.locations[0].packages.length 
                        && prev.payloadCalculated.locations[0].packages.length
                        && current.payloadCalculated.locations[0].globalAction
                        && current.payloadCalculated.locations[0].globalAction !== 3) {
                        console.log('current', current._id.toString());
                        console.log('prev', prev._id.toString());

                        const getCurrentLocation = (inv) => {
                            const index = inv.payloadCalculated.locations.findIndex(z => z.locationId === location._id.toString())
                            return inv.payloadCalculated.locations[index] || null
                        }

                        const currentLocation = getCurrentLocation(current)
                        const prevLocation = getCurrentLocation(prev)


                        currentLocation.packages.map(currentLocationPackage => {
                            const prevLocationPackageIndex = prevLocation.packages.findIndex(p => p.packageId === currentLocationPackage.packageId)
                            const prevLocationPackage = prevLocation.packages[prevLocationPackageIndex]
                          
                            if (currentLocation && prevLocation && prevLocationPackage) {  
                                const isCanceled = currentLocationPackage.canceled
                                const startDate = currentLocationPackage.startDate
                                const endDate = currentLocationPackage.expireDate
    
                                const currentDuration = currentLocation.month || currentLocation.day / 30
    
    
                                const idDateSame = () => {
                                const start = moment(startDate), end = moment(prevLocationPackage.endDate)
                                    return start.year() === end.year() && start.month() === end.month() && start.day() === end.day()
                                }

                                if (!prevLocationPackage) {
                                    console.log('error');
                                }

                                let fixedStartDate = prevLocationPackage.expireNew || prev.expireDate
                                if (idDateSame()) {
                                    fixedStartDate = endDate
                                }
                                 const fixedEndDate = moment(fixedStartDate).add(currentDuration, 'months');
    
    
                                current.payloadCalculated.locations.map(x => {
                                    x.packages.map(b => {
                                        b.expireNew = new Date(fixedEndDate)
                                        b.expireDate = new Date(fixedStartDate)
                                    })
                                })
    
                                const paylod = current.payloadCalculated
    
                                invoiceRepo.updateInvoicePayload(current._id, paylod)
                            }
                            
                        })

                    }

                } else console.log(`Location ${location._id.toString()} has only one invoice`);
                
            }
        } else console.log(`${item._id.toString()} has 0 locations`);
    }
    console.timeEnd('invoice')
}

const locationsUpdate = async () => {
    console.time('start')
    const idList = ["6478995e4a7b10c3f940abf3"]
    const filter = {
        clinetId: "6602dff61c35995a07b39029"
    }
    
    // const locations = await clientLocationRepo.getClientLocationByClientId("6602dff61c35995a07b39029")
    const locations = await clientLocationRepo.getAll()

    for (let i = 0; i < locations.length; i++) {
        const location = locations[i];
        console.log(location._id.toString());
        const [active, pending, inactive, canceled] = await Promise.all([
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
                state: 2,
                returnInvoice: null
            }),
            subscriptionRepo.getALl({
                location: location._id,
                state: 2,
                returnInvoice: { $ne: null }
            })
        ])
        let state = null
        console.log(`Old state is ${location._doc.subscriptionState}`);

        if (active.length) state = 3
        else if (inactive.length) state = 0
        else if (pending.length) state = 1
        else  if (canceled.length) state = 2
        else state = 0
        location.subcriptionState = state
        await clientLocationRepo.update({ _id: location._id }, { subscriptionState: state })
        console.log(`New state is ${location.subcriptionState}`);


    }
    console.timeEnd('start')
}

const clientsUpdate = async () => {

    console.time('start')

    const filter = {
        // _id: "647899c94a7b10c3f9429065"
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
        locations.forEach(x => states[x._doc.subscriptionState]+=1)
        let state = null
        if (states[3] > 0) state = 3
        else if (states[1] > 0) state = 1
        else if (states[2] > 0) state = 2
        else if (states[0] > 0) state = 0
        else state = 0

        console.log(`client Old state is ${client._doc.subscriptionState}`);
        console.log(`client New state is ${state}`);
        await clientsRepo.updateAll({ _id: client._id }, { subscriptionState: state })
    }
    
    console.timeEnd('start')
}

const map = [dateUpdate, locationsUpdate, clientsUpdate]

module.exports = {
    run: dateUpdate,
    run1: locationsUpdate,
    run2: clientsUpdate
}