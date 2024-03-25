const clientsRepo = require('../client/client.repository');
const subscriptionRepo = require('../subscription/subscription.repository');
const clientLocationRepo = require('../client/client_location.repository');
const invoiceRepo = require('../payment/invoice.repository')
const moment = require('moment')
const logger = require('../../utils/logger/logger');

const run = async () => {
    console.time('script')
    // const clientIdList = ['6479b4aca9767697cfd283a5']
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

            const invoiceLocationIndex = clientSubscription.invoice?.payloadCalculated?.locations?.findIndex(a => a.locationId = clientSubscription.location)
            console.log(clientSubscription.invoice?._id.toString());
            if (invoiceLocationIndex > -1) {
                subscriptionDuration = clientSubscription.invoice.payloadCalculated.locations[invoiceLocationIndex].month
            }
            
            const getStartDate = () => {
                console.log(moment.utc(clientSubscription.invoice?.payloadCalculated?.locations[0].packages[0]?.expireDate));
                const source = clientSubscription.invoice?.payloadCalculated?.locations[0].packages[0]?.expireDate || clientSubscription.createdAt
                let date = moment.utc(source)
                date.set({
                    hour: 0,
                    minute: 0
                  })
                return date
            }
            
            // const subscriptionStartDate = clientSubscription.invoice?.createdAt || clientSubscription.createdAt;
            const subscriptionStartDate = getStartDate();

            const calculateEndDate = () => {
                let start, end

                logger.info(client._id)
                logger.info(`${client.personalInfo.firstname} ${client.personalInfo.lastname}`)
                start = moment(subscriptionStartDate)
                end = start.add(subscriptionDuration, 'months')

                return moment.utc(end)
            }

            const subscriptionEndDate = calculateEndDate();

            if (client._id.toString() === '647898c94a7b10c3f93e1b5a') {
                console.log(client._id);
            }
            
            if (c === list.length - 2) {
                console.log(client._id.toString());
            }


            const getSubscriptionState = () => {
                let status = 2 
                console.log(`Moment utc now ${moment()}`);
                const isValidRange = moment().isBetween(subscriptionStartDate, subscriptionEndDate)
                if (isValidRange) {
                    console.log(clientSubscription._id.toString());
                    status = 1
                } else {
                    if (c + 1 === list.length && list.length > 1) {
                        const lastSubscription = list[c - 1]
                        console.log(moment.utc(lastSubscription?._doc?.endDate));
                        if (moment(subscriptionStartDate).isBefore(moment.utc(lastSubscription._doc?.endDate))) {
                            if (lastSubscription._doc.state === 2) {
                                status = 1
                            } else status = lastSubscription._doc.state
                        }
                    }
                }
                return status
            }
            
            
            let subscriptionState = getSubscriptionState();


            const isInDateRage = (date) => {
                return moment(date).isAfter(moment(subscriptionStartDate)) && moment(date).isBefore(moment(subscriptionEndDate))
            }


            logger.info('-------------------------------------------');
            logger.info(`subscription start Date is ${moment(subscriptionStartDate)}`);
            logger.info(`Invalid end date is ${clientSubscription.endDate}`);
            logger.info(`Valid end date is ${subscriptionEndDate}`);

            const subscriptionActivationDate1 = clientSubscription._doc?.location?._doc.subscriptionActivationDate;
            const subscriptionActivationDate = client._doc?.subscriptionActivationDate;

            //? witch one is real data
            console.log(`Location activation date by Location ${moment(subscriptionActivationDate1).format()}`);
            console.log(`Location activation date by Client ${moment(subscriptionActivationDate).format()}`);

            if (subscriptionActivationDate) {
                if (moment(subscriptionActivationDate).isAfter(moment(subscriptionStartDate)) 
                    && moment(subscriptionActivationDate).isBefore(subscriptionEndDate)) {
                    logger.info('Subscription must be active');
                    // clientSubscription.state = 2;
                    // clientSubscription.location.subscriptionActivationDate = subscriptionStartDate;
                    if (clientSubscription._doc?.location && clientSubscription._doc?.location !== 3) {
                        client.subscriptionState = 3; //? update client to subscription state like location
                        clientSubscription._doc.location.subscriptionState = 3; //! active if subscription is active
                    }
                } else {
                    // clientSubscription.state = 2; //! active because dates doesnt expire
                    if (clientSubscription._doc?.location) {
                        if (subscriptionState === 1) { //! is active
                            client.subscriptionState = 3; //? update client to subscription state like location
                            clientSubscription._doc.location.subscriptionState = 3; //! pending
                        } else {
                            client.subscriptionState = 0; //? update client to subscription state like location
                            clientSubscription._doc.location.subscriptionState = 0; //! inactive because subscription is not valid, expired
                        }
                    }
                }

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