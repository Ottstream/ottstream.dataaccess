const clientsRepo = require('../client/client.repository');
const subscriptionRepo = require('../subscription/subscription.repository');
const clientLocationRepo = require('../client/client_location.repository');
const invoiceRepo = require('../payment/invoice.repository')
const moment = require('moment')
const logger = require('../../utils/logger/logger');

const run = async () => {
    console.time('script')
    // const clientIdList = ['65d5a567c47c140f2f71c0bd']
    // const clients = await clientsRepo.getAll({ _id: { $in: clientIdList } })
    // let next = true
    // let page = 1, limit = 100
    // while (next) {
    const clients = await clientsRepo.getAll({  })
    // if (!clients.length) next = false
    for (let i = 0; i < clients.length; i++) {
        const client = clients[i];

        const list = await subscriptionRepo.getALl({
            client: client._id
        });

        const locationsMap = new Map()
        for (let c = 0; c < list.length; c++) {
            const clientSubscription = list[c];

            let subscriptionDuration = 1;

            let invoice =  await invoiceRepo.getLast({
                location: clientSubscription.location
            })
            let invoiceLocation = null
            if (!invoice) {
                invoice = await invoiceRepo.getLast({
                    location: clientSubscription.location
                })
            }

            const getSubscriptionDuration = () => {
                let dur = 1
                if (invoice) {
                    const index = invoice.payloadCalculated.locations.findIndex(a => a.locationId = clientSubscription.location)
                    if (index > -1) {
                        dur = invoice.payloadCalculated.locations[index].month
                        invoiceLocation = invoice.payloadCalculated.locations[index]
                    }
                }
                return dur
            }


            subscriptionDuration = getSubscriptionDuration() //! corrct duration
            // const invoiceLocationIndex = invoice.payloadCalculated?.locations?.findIndex(a => a.locationId = clientSubscription.location)
            // if (invoiceLocationIndex > -1) {
            //     subscriptionDuration = invoice.payloadCalculated.locations[invoiceLocationIndex].month
            // }
            
            const getStartDate = () => {
                if (!invoice) {
                    return clientSubscription.createdAt
                }
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
                if (isValidRange) {
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
                        if (moment(clientSubscription._doc.location._doc.subscriptionCancelDate).isAfter(moment(clientSubscription._doc.location._doc.subscriptionActivationDate))) {
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

            logger.info('-------------------------------------------')
            // const subscriptionActivationDate = clientSubscription.location.
        };

    }
    // console.log(`${page * limit} done`)
    // page++
    console.timeEnd('script')
}

module.exports = {
    run
}