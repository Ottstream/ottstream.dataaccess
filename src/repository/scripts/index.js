const clientsRepo = require('../client/client.repository');
const subscriptionRepo = require('../subscription/subscription.repository');
const clientLocationRepo = require('../client/client_location.repository');
const invoiceRepo = require('../payment/invoice.repository')
const moment = require('moment')
const logger = require('../../utils/logger/logger');
const HistoryLog = require('../../models/history_log')
const { Types } = require('mongoose');
const transactionsRepo = require('../../repository/payment/transaction.repository')


const dateUpdate = async () => {
    console.time('script')

    const clientIdList = [
        // '647898b94a7b10c3f93dc41e'

    ]
    const clientsList = await clientsRepo.getAll(filter)
    // const clientsList = await clientsRepo.getAll({})
    let count = 0, subscrioptionCount = 0
    for (let i = 0; i < clientsList.length; i++) {
        const client = clientsList[i];

        let calculatedPackages = {}

        const list = await subscriptionRepo.getALl({
            client: client._id
        });
        subscrioptionCount += list.length
        const locationsMap = new Map()
        for (let c = 0; c < list.length; c++) {
            const clientSubscription = list[c];

            if (c === list.length - 2) {
                console.log('last');
            }

            if (clientSubscription.location
                && (clientSubscription.returnInvoice || clientSubscription.invoice)
                && (!calculatedPackages[clientSubscription.location._id.toString()] || !calculatedPackages[clientSubscription.location?._id.toString()].includes(clientSubscription.package.toString()))) { //! if location was't deleted!

                let subscriptionDuration = 1;

                let invoice = clientSubscription.returnInvoice || clientSubscription.invoice

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
                        })

                        logger.info(client._id)
                        logger.info(`${client.personalInfo.firstname} ${client.personalInfo.lastname}`)
                        if (!end) {
                            start = moment(subscriptionStartDate)
                            end = start.add(subscriptionDuration, 'months')
                        }

                        return moment.utc(end)
                    }

                    let subscriptionEndDate = calculateEndDate(); //! correct end date

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
                } else {
                    if (moment(clientSubscription.endDate).isAfter(moment())) {
                        clientSubscription.state = 1
                        clientSubscription.isActive = true
                        clientSubscription.save()
                    }
                };
            } else {
                clientSubscription.state = 2
                clientSubscription.save()
            }
        }



    }
    console.log(`Done ${count} of ${subscrioptionCount}`);
    console.timeEnd('script')
}

const invoiceUpdate = async () => {
    const idList = [
        '6478992b4a7b10c3f93fca7e'

    ]
    const clients = await clientsRepo.getAll({ _id: "647898b94a7b10c3f93dc41e" })
    // const clients = await clientsRepo.getAll({})
    console.time('invoice')
    for (let index = 0; index < clients.length; index++) {
        const item = clients[index];
        const locations = await clientLocationRepo.getClientLocationByClientId(item._id)
        if (locations.length) {
            for (let locIndex = 0; locIndex < locations.length; locIndex++) {
                const location = locations[locIndex];

                const invoiceCounts = await invoiceRepo.getCounts({
                    "payloadCalculated.locations.locationId": location?._id.toString(),
                    payed: { $exists: true, $gt: 0 }
                })

                let skip = 0, pagesLeft = true, isNan = true, maxCount = 500000000
                for (let j = 0; j < invoiceCounts; j++) {

                    if (!isNan && invoiceCounts > 1) {
                        skip += 1
                    }

                    if (skip + 1 > maxCount) {
                        pagesLeft = false
                    }

                    if (pagesLeft) {
                        isNan = false
                        const invoices = await invoiceRepo.getListBySortAndLimit({
                            "payloadCalculated.locations.locationId": location?._id.toString(),
                            payed: { $exists: true, $gt: 0 }
                        }, 2, skip)

                        if (invoices.length > 1) {
                            const prev = invoices[0]
                            const current = invoices[1]

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

                                    if (currentLocation && prevLocation && prevLocationPackage && prevLocationPackage.expireNew) {
                                        const isCanceled = currentLocationPackage.canceled
                                        const startDate = currentLocationPackage.startDate
                                        const endDate = currentLocationPackage.expireDate

                                        const currentDuration = currentLocation.month || currentLocation.day

                                        const durationVolume = currentLocation.month ? 'months' : 'days'

                                        const idDateSame = () => {
                                            const start = moment(startDate), end = moment(expireEnd)
                                            return start.year() === end.year() && start.month() === end.month() && start.day() === end.day()
                                        }

                                        if (!prevLocationPackage) {
                                            console.log('error');
                                        }

                                        const expireEnd = prevLocationPackage.expireNew
                                        let fixedStartDate = expireEnd



                                        // if (idDateSame()) {
                                        //     fixedStartDate = endDate
                                        // }
                                        const fixedEndDate = moment(fixedStartDate).add(currentDuration, durationVolume);


                                        const isPrevPackageExpired = moment(prevLocationPackage.expireNew).isBefore(moment())


                                        if (isPrevPackageExpired) {

                                            current.payloadCalculated.locations.map(x => {
                                                x.packages.map(b => {
                                                    const expDate = moment(current.createdAt).add(currentDuration, durationVolume)
                                                    b.expireNew = new Date(expDate)
                                                })
                                            })

                                            const paylod = current.payloadCalculated

                                            invoiceRepo.updateInvoicePayload(current._id, paylod)

                                        } else {
                                            current.payloadCalculated.locations.map(x => {
                                                x.packages.map(b => {
                                                    if (prevLocationPackage.expireDate) {
                                                        b.expireDate = prevLocationPackage.expireNew
                                                    }

                                                    b.expireNew = new Date(fixedEndDate)
                                                })
                                            })

                                            const paylod = current.payloadCalculated

                                            invoiceRepo.updateInvoicePayload(current._id, paylod)
                                        }

                                    }

                                })

                            }

                        } else if (invoices.length) {
                            const invoice = invoices[0]

                            const getCurrentLocation = (inv) => {
                                const index = inv.payloadCalculated.locations.findIndex(z => z.locationId === location._id.toString())
                                return inv.payloadCalculated.locations[index] || null
                            }

                            const currentLocation = getCurrentLocation(invoice)

                            if (currentLocation.packages.length) {
                                const duration = currentLocation.month || currentLocation.day

                                const durationType = currentLocation.month ? 'months' : 'days'

                                const isPackageExpired = moment(currentLocation.packages[0].expireNew).isBefore(moment())

                                if (isPackageExpired) {
                                    invoice.payloadCalculated.locations.map(x => {
                                        x.packages.map(b => {
                                            const expDate = moment(invoice.createdAt).add(duration, durationType)
                                            b.expireNew = new Date(expDate)
                                        })
                                    })

                                    const paylod = invoice.payloadCalculated

                                    invoiceRepo.updateInvoicePayload(invoice._id, paylod)
                                } else {
                                    invoice.payloadCalculated.locations.map(x => {
                                        x.packages.map(b => {
                                            let expiredDate, expireNew, startDate
                                            if (b.expireDate) {
                                                expiredDate = moment(b.expireNew).subtract(duration, durationType)
                                            }

                                            if (b.startDate) {
                                                startDate = b.expireDate
                                            }

                                            expireNew = moment(b.expireDate).add(duration, durationType)

                                            b.expireNew = new Date(expireNew)
                                        })
                                    })

                                    const paylod = invoice.payloadCalculated

                                    invoiceRepo.updateInvoicePayload(invoice._id, paylod)
                                }
                            }
                        }


                    }

                }

            }
        } else console.log(`${item._id.toString()} has 0 locations`);
    }
    console.timeEnd('invoice')
}

const locationsUpdate = async (req, res) => {
    const { client } = req.body
    console.time('start')
    const idList = ["6478995e4a7b10c3f940abf3"]
    const filter = {
        clinetId: "6602dff61c35995a07b39029"
    }
    let updatedCount = 0
    const locations = await clientLocationRepo.getClientLocationByClientId(client)
    // const locations = await clientLocationRepo.getAll({})

    for (let i = 0; i < locations.length; i++) {
        const location = locations[i];
        console.log(location._id.toString());
        const [active, pending, canceled] = await Promise.all([
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
                returnInvoice: { $ne: null }
            })
        ])
        let state = null
        if (active.length) state = 3
        else if (pending.length) state = 1
        else if (canceled.length) state = 2
        else state = 0
        if (location.subscriptionState !== state) {
            updatedCount++
            console.log(updatedCount);
            console.log(`New state is ${state}  Old state is ${location.subscriptionState}`);
            location.subscriptionState = state
            await clientLocationRepo.update({ _id: location._id }, { subscriptionState: state })
        }



    }
    console.timeEnd('start')
    res.send({ message: 'ok' })

}

const locationsUpdateAll = async (req, res) => {
    console.time('start')
    const idList = ["6478995e4a7b10c3f940abf3"]
    const filter = {
        clinetId: "6602dff61c35995a07b39029"
    }
    let updatedCount = 0
    // const locations = await clientLocationRepo.getClientLocationByClientId(client)
    const locations = await clientLocationRepo.getAll({})

    for (let i = 0; i < locations.length; i++) {
        const location = locations[i];
        console.log(location._id.toString());
        const [active, pending, canceled] = await Promise.all([
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
                returnInvoice: { $ne: null }
            })
        ])
        let state = null
        if (active.length) state = 3
        else if (pending.length) state = 1
        else if (canceled.length) state = 2
        else state = 0
        if (location.subscriptionState !== state) {
            updatedCount++
            console.log(updatedCount);
            console.log(`New state is ${state}  Old state is ${location.subscriptionState}`);
            location.subscriptionState = state
            await clientLocationRepo.update({ _id: location._id }, { subscriptionState: state })
        }



    }
    console.timeEnd('start')
    res.send({ message: 'ok' })

}

const clientsUpdate = async (req, res) => {
    const { client } = req.body
    console.time('start')
    const clientsList = await clientsRepo.getAll({ _id: client })

    for (let i = 0; i < clientsList.length; i++) {
        const client = clientsList[i];

        const locations = await clientLocationRepo.getClientLocationByClientId(client._id)
        let states = {
            0: 0,
            1: 0,
            2: 0,
            3: 0
        }

        locations.forEach(x => {
            states[x._doc.subscriptionState] += 1
        })
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
    res.send({ message: 'ok' })

}


const clientsUpdateAll = async (req, res) => {
    console.time('start')
    const clientsList = await clientsRepo.getAll({})

    for (let i = 0; i < clientsList.length; i++) {
        const client = clientsList[i];

        const locations = await clientLocationRepo.getClientLocationByClientId(client._id)
        let states = {
            0: 0,
            1: 0,
            2: 0,
            3: 0
        }

        locations.forEach(x => {
            states[x._doc.subscriptionState] += 1
        })
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
    res.send({ message: 'ok' })

}

const updateClientInfo = async (req, res) => {
    const { client } = req.body
    console.time('start')
    const clientsList = await clientsRepo.getAll({ _id: client })

    for (let i = 0; i < clientsList.length; i++) {
        const client = clientsList[i];

        const locations = await clientLocationRepo.getClientLocationByClientId(client._id)
        let availablePackages = client.info.availablePackages, infoLocations = []

        for (let l = 0; l < locations.length; l++) {
            const location = locations[l];
            const index = client.info.locations.findIndex(x => x.login === location.login)
            if (index > -1) {
                console.log(client.info.locations[index].login, ` ${client.info.locations[index].subscriptionState} = ${location.subscriptionState}`);
                infoLocations.push({ ...client.info.locations[index], subscriptionState: location.subscriptionState })
            }
        }
        await clientsRepo.updateAll({ _id: client._id }, { info: { availablePackages, locations: infoLocations } })

    }

    console.timeEnd('start')

    res.send({ message: 'ok' })
}

const updateClientInfoAll = async (req, res) => {
    console.time('start')
    const clientsList = await clientsRepo.getAll({})

    for (let i = 0; i < clientsList.length; i++) {
        const client = clientsList[i];

        const locations = await clientLocationRepo.getClientLocationByClientId(client._id)
        let availablePackages = client.info.availablePackages, infoLocations = []

        for (let l = 0; l < locations.length; l++) {
            const location = locations[l];
            const index = client.info.locations.findIndex(x => x.login === location.login)
            if (index > -1) {
                console.log(client.info.locations[index].login, ` ${client.info.locations[index].subscriptionState} = ${location.subscriptionState}`);
                infoLocations.push({ ...client.info.locations[index], subscriptionState: location.subscriptionState })
            }
        }
        await clientsRepo.updateAll({ _id: client._id }, { info: { availablePackages, locations: infoLocations } })

    }

    console.timeEnd('start')

    res.send({ message: 'ok' })
}

const map = [dateUpdate, locationsUpdate, clientsUpdate]


const setAllSubscriptionsWithoutInvoicesInactive = async () => {

}

// var filter = {
//     _id: { $in: ['65b597f8fb4838ca22b6f288'
// }

const forkSubscriptions = async () => {
    console.time('start')
    const clientsList = await clientsRepo.getAll(filter)

    let subscriptionDisabledCount = 0, subscriptionTotalCount = 0;

    for (let i = 0; i < clientsList.length; i++) {
        const client = clientsList[i];
        const locations = await clientLocationRepo.getAll({
            clientId: client._id
        })
        for (let j = 0; j < locations.length; j++) {
            const location = locations[j];

            const list = await subscriptionRepo.getALl({
                location: location._id
            });
            console.log(`${subscriptionDisabledCount} from ${subscriptionTotalCount}`);
            subscriptionTotalCount += list.length
            const subscriptionPackages = []

            for (let k = 0; k < list.length; k++) {
                const subscription = list[k];

                if (!subscriptionPackages.includes(subscription.package.toString())) {
                    subscriptionPackages.push(subscription.package.toString())
                } else {
                    subscriptionDisabledCount++
                    subscription.state = 2
                    subscription.isActive = false
                    subscription.save()
                }
            }

        }
    }

    console.log(`subscription disabled count ${subscriptionDisabledCount} from ${subscriptionTotalCount}`);
    console.timeEnd('start')

}

const isInvoicePayedFirstTime = (payload) => {
    return !!(payload && payload.packages[0] && payload.packages[0].expireNew && (!payload.packages[0].expireDate && !payload.packages[0].startDate))
}

const isRepayedInvoice = (payload) => {
    return !!(payload && payload.packages[0] && payload.packages[0].expireNew && payload.packages[0].expireDate && payload.packages[0].startDate)
}

const isPrevInvoiceExpired = (payload, endDate) => {
    return moment(payload.packages[0].expireNew).isBefore(endDate)
}

const isThisDateInvalid = (invoice) => {
    return moment(invoice.createdAt).isAfter(moment('2024-03-11'))
}

const invoiceRecalculation = async () => {
    console.time('start');
    const clientsList = await clientsRepo.getAll(filter)
    for (let i = 0; i < clientsList.length; i++) {
        const client = clientsList[i];

        const locations = await clientLocationRepo.getAll({
            clientId: client._id,
        })

        for (let j = 0; j < locations.length; j++) {
            const location = locations[j];
            let skip = 0
            const invoices = await invoiceRepo.getListBySortAndLimit({
                "payloadCalculated.locations.locationId": location._id.toString(),
                "payloadCalculated.locations.packages": { $ne: [] },
                payed: { $ne: 0 }
            }, 1000, skip)

            if (invoices.length === 1) {

                invoices[0].payloadCalculated.locations.map(x => {

                    x.packages.map(b => {
                        if (x.subscribeToDate) {
                            b.expireNew = x.subscribeToDate
                        } else {
                            const duration = x.month || x.day
                            const durationType = x.month ? 'months' : 'days'
                            const expireNew = moment(invoices[0].startDate).add(duration, durationType)
                            console.log(`No repayed ExpireDate ${b.expireNew} - ${duration} - ${durationType} = ${new Date(expireNew)}`);
                            b.expireNew = new Date(expireNew)
                            if (b.expireDate) b.expireDate = invoices[0].startDate
                        }
                    })
                })
                const paylod = invoices[0].payloadCalculated

                invoiceRepo.updateInvoicePayload(invoices[0]._id, paylod)


            } else {
                for (let k = 0; k < invoices.length; k++) {
                    const prevInvoice = invoices[k];
                    const currentIvoice = invoices[k + 1]; // always use currnet
                    if (currentIvoice) {
                        console.log('------------------------------------');
                        console.log(`Currnet invoice: ${currentIvoice._id.toString()}`);
                        console.log(`Prev invoice: ${prevInvoice._id.toString()}`);

                        const currentPayload = currentIvoice.payloadCalculated.locations[0]
                        const prevPayload = prevInvoice.payloadCalculated.locations[0]

                        const IsRepayedInvoice = isRepayedInvoice(currentPayload)

                        // if (IsInvoicePayedFirstTime) { //!
                        const isInvalidDate = isThisDateInvalid(currentIvoice)
                        if (currentPayload.subscribeToDate && isInvalidDate) {
                            currentIvoice.payloadCalculated.locations.map(x => {

                                x.packages.map(b => {
                                    b.expireDate = prevPayload.packages[0].expireNew
                                    b.expireNew = prevPayload.packages[0].expireNew
                                })
                            })
                            const paylod = currentIvoice.payloadCalculated

                            invoiceRepo.updateInvoicePayload(currentIvoice._id, paylod)
                        } else if (IsRepayedInvoice) {


                            currentIvoice.payloadCalculated.locations.map(x => {

                                const prevPayloadLocationIndex = prevInvoice.payloadCalculated.locations.findIndex(j => j.locationId === x.locationId)
                                if (prevPayloadLocationIndex > -1) {
                                    x.packages.map(b => {

                                        if (x.subscribeToDate) {
                                            b.expireDate = x.subscribeToDate
                                        } else if (prevInvoice.canceledExecuted) {
                                            b.expireDate = prevInvoice.payloadCalculated.locations[prevPayloadLocationIndex]
                                                .packages[0].expireDate
                                        } else if (isPrevInvoiceExpired(prevPayload, currentIvoice.startDate)) { //!
                                            b.expireDate = currentIvoice.startDate
                                        } else if (prevInvoice.payloadCalculated.refund
                                            && prevInvoice.payloadCalculated.locations[prevPayloadLocationIndex].packages[0].canceled) {
                                            b.expireDate = currentIvoice.startDate
                                        } else if (prevInvoice.payloadCalculated.locations[prevPayloadLocationIndex]
                                            .subscribeToDate) {
                                            b.expireDate = x.subscribeToDate
                                        } else {
                                            b.expireDate = prevInvoice.payloadCalculated.locations[prevPayloadLocationIndex]
                                                .packages[0].expireNew
                                        }

                                        const duration = x.month || x.day
                                        const durationType = x.month ? 'months' : 'days'

                                        const expireNew = x.subscribeToDate ?
                                            b.expireDate
                                            : new Date(moment(b.expireDate).add(duration, durationType))

                                        b.expireNew = expireNew
                                        console.log(new Date(moment.utc(currentIvoice.createdAt)));
                                        x.subscribeToDate ?
                                            console.log(`ExpireDate ${b.expireDate} - to date = ${x.subscribeToDate} = ${b.expireNew}`)
                                            : console.log(`ExpireDate ${b.expireDate} - ${duration} - ${durationType} = ${b.expireNew}`);
                                    })
                                }
                            })

                            const paylod = currentIvoice.payloadCalculated

                            invoiceRepo.updateInvoicePayload(currentIvoice._id, paylod)

                            // expirenew expiredate startdate
                        } else {
                            // expirenew + duration

                            currentIvoice.payloadCalculated.locations.map(x => {

                                x.packages.map(b => {
                                    if (x.subscribeToDate) {
                                        b.expireNew = x.subscribeToDate
                                    } else {
                                        const duration = x.month || x.day
                                        const durationType = x.month ? 'months' : 'days'
                                        const expireNew = moment(currentIvoice.startDate).add(duration, durationType)
                                        console.log(`No repayed ExpireDate ${b.expireNew} - ${duration} - ${durationType} = ${new Date(expireNew)}`);
                                        b.expireNew = new Date(expireNew)

                                    }
                                })
                            })
                            const paylod = currentIvoice.payloadCalculated

                            invoiceRepo.updateInvoicePayload(currentIvoice._id, paylod)

                        }
                    }

                    // }

                }
            }

        }


    }
    console.timeEnd('start');
}


const scriptWorker = async (req, res) => {
    // const query = req?.query
    // switch (query?.job) {
    //     case 'invoice':
    //         invoiceUpdate()
    //         break;
    //     case 'date':
    //         dateUpdate()
    //         break;

    //     case 'location':
    //         locationsUpdate()
    //         break;
    //     case 'client':
    //         clientsUpdate()
    //         break;
    //     case 'inactive':
    //         setInactiveClientsDates()
    //         break;
    //     default:
    //         dateUpdate()
    //         break;
    // }
    return invoiceRecalculation().then(() => dateUpdate().then(() => forkSubscriptions().then(() => locationsUpdate().then(() => clientsUpdate()))))



}

var filter = {
    _id: {
        $in: ['6479b4c1a9767697cfd2b16b'
            , '6479b4b3a9767697cfd28f38'
            , '647899b94a7b10c3f942560e'
            , '6478995a4a7b10c3f9409b23'
            , '6479b274a9767697cfcccaa0'
            , '6479b49da9767697cfd25168'
            , '65a883bd9644844c4b8b441d'
            , '660c1b77f5c2f275875b6bc5'
            , '6478995c4a7b10c3f940a38c'
            , '6582e5f21c39810087b12084'
            , '647899794a7b10c3f9414a44'
            , '64e00feecaa9bf178a925967'
            , '6479b498a9767697cfd2485e'
            , '6478996c4a7b10c3f940fce4'
            , '65c89515ff98c0ccdcf407f6'
            , '647899b44a7b10c3f9424b19'
            , '6478997f4a7b10c3f94166db'
            , '6479acf3e256713da839635f'
            , '647899bf4a7b10c3f9426a9f'
            , '64f7787960948d6be0744744'
            , '65777e00d066edcd5d386a5a'
            , '6479b273a9767697cfccc836'
            , '6479b273a9767697cfccc7d4'
            , '647898b94a7b10c3f93dc1ce'
            , '647899a74a7b10c3f9422097'
            , '647898f14a7b10c3f93ed1f6'
            , '647898b44a7b10c3f93da868'
            , '647898b54a7b10c3f93dad51'
            , '647899a64a7b10c3f9421af4'
            , '6479b49aa9767697cfd24d80'
            , '65ea35736d1d803754e837f0'
            , '6478994d4a7b10c3f9404f44'
            , '6478995d4a7b10c3f940a880'
            , '647898c94a7b10c3f93e1d65'
            , '647899c64a7b10c3f9427d79'
            , '647898b74a7b10c3f93db7b9'
            , '6478999d4a7b10c3f941ea04'
            , '6478999e4a7b10c3f941efea'
            , '647899a94a7b10c3f9422b5c'
            , '647899394a7b10c3f93ff9e0'
            , '6478995a4a7b10c3f94098c6'
            , '647899a04a7b10c3f941fcf9'
            , '6478995a4a7b10c3f9409b04'
            , '647899674a7b10c3f940e007'
            , '647899814a7b10c3f94170b5'
            , '647899b04a7b10c3f9423f85'
            , '647899584a7b10c3f9408c01'
            , '6478995b4a7b10c3f9409c82'
            , '647899a54a7b10c3f942149b'
            , '647899794a7b10c3f9414521'
            , '647899754a7b10c3f9413307'
            , '659edb98f93d89792072cb69'
            , '647899134a7b10c3f93f5818'
            , '647899754a7b10c3f9413003'
            , '65bac567cae161bccfc924b1'
            , '647898ba4a7b10c3f93dc656'
            , '647c70ece905f463951173ee'
            , '65d32526bc8131bc79fcc7e3'
            , '647899484a7b10c3f9403873'
            , '647899914a7b10c3f941aa00'
            , '6479b268a9767697cfcca636'
            , '6478998c4a7b10c3f9419889'
            , '657cc182c541606cb06e5268'
            , '647898b84a7b10c3f93dbde3'
            , '647898ee4a7b10c3f93ec291'
            , '64939fcf1405dac14580aead'
            , '647899734a7b10c3f94122f1'
            , '647899694a7b10c3f940e91c'
            , '6478998e4a7b10c3f9419cfb'
            , '647899764a7b10c3f94137f3'
            , '647899784a7b10c3f9414084'
            , '6478997c4a7b10c3f9415404'
            , '6478995f4a7b10c3f940b35b'
            , '647898b24a7b10c3f93d9f62'
            , '647898f04a7b10c3f93ed118'
            , '6552635a97f6b72119f35560'
            , '647898cd4a7b10c3f93e32bc'
            , '647898fb4a7b10c3f93ef866'
            , '6479b48da9767697cfd21e8d'
            , '647899b24a7b10c3f942442b'
            , '647899904a7b10c3f941a455'
            , '6478992b4a7b10c3f93fc8ff'
            , '64ee3c20d2b16e3eaa004e7b'
            , '647898c74a7b10c3f93e12b4'
            , '647899b64a7b10c3f94251b8'
            , '647899a14a7b10c3f94201a0'
            , '647899c34a7b10c3f94274ae'
            , '647899044a7b10c3f93f172e'
            , '647899144a7b10c3f93f5f6e'
            , '647899c64a7b10c3f9427e66'
            , '647899a84a7b10c3f94225c3'
            , '6479b47da9767697cfd1e233'
            , '6479b242a9767697cfcc4348'
            , '647899884a7b10c3f9418679'
            , '6542a05e16b0d3f2f177fb04'
            , '647899974a7b10c3f941c98e'
            , '647898b94a7b10c3f93dc41e'
            , '6602294b20bb5aa95a7fffc6'
            , '65cd464b145e3b2354e5a38d'
            , '6479b4b6a9767697cfd2966d'
            , '647898bd4a7b10c3f93dd707'
            , '647899754a7b10c3f94132bd'
            , '647899714a7b10c3f9411606'
            , '647899894a7b10c3f9418b34'
            , '6478998c4a7b10c3f94195d3'
            , '6479b27da9767697cfcce4d9'
            , '6478997d4a7b10c3f9415dd0'
            , '647898ce4a7b10c3f93e3b7b'
            , '647899ae4a7b10c3f9423603'
            , '647898e54a7b10c3f93ea515'
            , '6478997f4a7b10c3f94168cc'
            , '647899c54a7b10c3f9427a7b'
            , '647899964a7b10c3f941c409'
            , '647899964a7b10c3f941c849'
            , '6488f4c698410d5fb374bc78'
            , '647898ef4a7b10c3f93ec7ac'
            , '6479b4c1a9767697cfd2b095'
            , '647898bc4a7b10c3f93dd0c4'
            , '647899704a7b10c3f941145c'
            , '6478999b4a7b10c3f941df24'
            , '6479b48fa9767697cfd22423'
            , '647899724a7b10c3f9411b68'
            , '6478996b4a7b10c3f940f814'
            , '647898c54a7b10c3f93e04b5'
            , '647898c44a7b10c3f93e0235'
            , '6479b4bca9767697cfd2a339'
            , '6479ad05e256713da839abac'
            , '6478997e4a7b10c3f9416103'
            , '647899724a7b10c3f9411aad'
            , '6479b4c0a9767697cfd2acd0'
            , '647898bc4a7b10c3f93dd23f'
            , '6478999d4a7b10c3f941e93d'
            , '6478998a4a7b10c3f94190aa'
            , '6478996c4a7b10c3f940f9f6'
            , '647899744a7b10c3f9412c53'
            , '6478991a4a7b10c3f93f812b'
            , '6479b47fa9767697cfd1e8a8'
            , '647899944a7b10c3f941b77d'
            , '647899904a7b10c3f941a49f'
            , '647899a14a7b10c3f941fde3'
            , '6479b4c0a9767697cfd2ad7b'
            , '647899394a7b10c3f93ff936'
            , '647899324a7b10c3f93fdf23'
            , '6478999e4a7b10c3f941efc7'
            , '648dfde9c7b0fc0616aa57eb'
            , '6479b490a9767697cfd2286f'
            , '653f62581f9e3ac0ed74e734'
            , '647899bf4a7b10c3f9426ace'
            , '65ddf0421e2774b7861fa135'
            , '6478998d4a7b10c3f9419b1c'
            , '6478994e4a7b10c3f9405487'
            , '647899b84a7b10c3f94252f4'
            , '6479b280a9767697cfcceb58'
            , '647898c64a7b10c3f93e0b3b'
            , '647899a24a7b10c3f9420613'
            , '647898d24a7b10c3f93e5186'
            , '647899894a7b10c3f9418a5d'
            , '6479b4a3a9767697cfd26948'
            , '6478999f4a7b10c3f941f614'
            , '647899994a7b10c3f941d5f6'
            , '6478996b4a7b10c3f940f5d1'
            , '647899744a7b10c3f9412ce7'
            ,
            '6479b48ea9767697cfd22363'
            , '6479b4a2a9767697cfd26540'
            , '6479acf3e256713da8396163'
            , '647898bd4a7b10c3f93dd4ee'
            , '6479b4a9a9767697cfd2790d'
            , '647899964a7b10c3f941c6fe'
            , '6479b485a9767697cfd2028d'
            , '647899614a7b10c3f940ba90'
            , '6479b26da9767697cfccb4e7'
            , '65d5a567c47c140f2f71c0bd'
            , '65341a9f3d4c091541bb5240'
            , '6478994f4a7b10c3f9405a5b'
            , '6479acd5e256713da838de99'
            , '6479b243a9767697cfcc44a9'
            , '647898bc4a7b10c3f93dd2ac'
            , '647899c34a7b10c3f9427319'
            , '6478996f4a7b10c3f9410d70'
            , '647899584a7b10c3f9408d22'
            , '6478993d4a7b10c3f9401376'
            , '647899c34a7b10c3f94273d4'
            , '647899194a7b10c3f93f7803'
            , '647899334a7b10c3f93fe3b3'
            , '6478996a4a7b10c3f940f074'
            , '6479b482a9767697cfd1f58d'
            , '6479b49da9767697cfd251af'
            , '647899c84a7b10c3f9428b0b'
            , '6479b266a9767697cfcc9fad'
            , '6479b485a9767697cfd1ff05'
            , '6478997c4a7b10c3f941544a'
            , '647899984a7b10c3f941cf7d'
            , '647899a74a7b10c3f9422124'
            , '647898c94a7b10c3f93e1cd1'
            , '647898cd4a7b10c3f93e3697'
            , '647899954a7b10c3f941c084'
            , '6478997a4a7b10c3f9414b0f'
            , '6479b4b3a9767697cfd28e38'
            , '647899434a7b10c3f9402a20'
            , '647899944a7b10c3f941b912'
            , '6478998a4a7b10c3f9418d0b'
            , '6479b49ea9767697cfd2574c'
            , '6479b4aca9767697cfd282f6'
            , '6478991a4a7b10c3f93f7e85'
            , '647899bb4a7b10c3f9425e52'
            , '6479b242a9767697cfcc431d'
            , '6479b240a9767697cfcc3b32'
            , '6478999f4a7b10c3f941f695'
            , '647898b44a7b10c3f93da605'
            , '65c8e331ff98c0ccdcf4a035'
            , '647899a44a7b10c3f9420ac6'
            , '647898e14a7b10c3f93e9882'
            , '6478994c4a7b10c3f9404a14'
            , '647899a04a7b10c3f941fc42'
            , '647899604a7b10c3f940b734'
            , '647898d14a7b10c3f93e49bf'
            , '647899804a7b10c3f9416e55'
            , '647899844a7b10c3f9417a3d'
            , '647899a64a7b10c3f94219b5'
            , '647899994a7b10c3f941d294'
            , '647899964a7b10c3f941c6a8'
            , '647898df4a7b10c3f93e929e'
            , '6478994b4a7b10c3f9404681'
        ]
    }
    // _id: { $in: ["6478995a4a7b10c3f9409b23"] }
}


const inject = async (req, res) => {
    const { data } = req.body

    for (let i = 0; i < data.length; i++) {
        const element = data[i];

        if (element.hasOwnProperty('client')) {
            const client = await clientsRepo.getClientById(element.client.locationExpireDate.client)
            const clientLocationIndex = client.info.locations.findIndex(x => x.login === element.client.locationExpireDate.locationLogin)
            if (clientLocationIndex > -1) {
                const infoLocations = client.info.locations.map(loc => {
                    if (loc.login === element.client.locationExpireDate.locationLogin) {
                        loc.subscriptionExpireDate = new Date(element.client.locationExpireDate.to)
                    }
                    return loc
                })
                client.info.locations = infoLocations
                await clientsRepo.updateClientById(client._id, { info: client.info })
            }
        }

        if (element.hasOwnProperty('subscription')) {
            for (let s = 0; s < element.subscription.length; s++) {
                const item = element.subscription[s];
                if (item.subscription) {
                    const subscription = await subscriptionRepo.getById(item.subscription)
                    if (item.key === 'isActive') {
                        subscription.state = item.value.currentState ? 1 : 2
                    }

                    if (item.key === 'startDate') {
                        subscription.startDate = new Date(item.value.to)
                    }

                    if (item.key === 'expireDate') {
                        subscription.endDate = new Date(item.value.to)
                    }

                    await subscriptionRepo.updateSubscriptionById(item.subscription, subscription)
                } else if (item.location) {
                    const location = await clientLocationRepo.getById(item.location)

                    if (item.key === 'subscriptionExpireDate') {
                        location.subscriptionExpireDate = new Date(item.value.to)
                    }


                    if (item.key === 'subscriptionActivationDate') {
                        location.subscriptionActivationDate = new Date(item.value.to)
                    }

                    if (item.key === 'subscriptionCancelDate') {
                        location.subscriptionCancelDate = new Date(item.value.to)
                    }

                    if (item.key === 'subscriptionPendingDate') {
                        location.subscriptionPendingDate = new Date(item.value.to)
                    }

                    await clientLocationRepo.update({ _id: location._id }, location)
                }

            }
        }

        if (element.hasOwnProperty('invoices')) {
            element.invoices.map(async item => {
                Object.keys(item).map(async k => {
                    const loaded = item[k]
                    const invoice = await invoiceRepo.getInvoiceById(loaded.invoice)
                    if (invoice) {
                        const locations = invoice.payloadCalculated.locations.map(loc => {
                            loc.packages = loc.packages.map(package => {
                                if (package.packageId === loaded.packageId) {
                                    package[loaded.key] = new Date(loaded.value.to)
                                }
                                return package
                            })
                            return loc
                        })

                        invoice.payloadCalculated.locations = locations
                        await invoiceRepo.updateInvoiceById(invoice._id, { payloadCalculated: invoice.payloadCalculated })
                    }
                })
            })
        }
    }
    const log = await HistoryLog.create({ data })
    return res.status(200).send({ message: 'Saved', log })

}


const getFileJSON = async () => {
    const fs = require('fs'), path = require('path'), csv = require('csv-parser')
    const file = path.join(__dirname, './ALLCLIENTS_3.csv')
    const list = []
    return new Promise(resolve => {
        fs.createReadStream(file)
            .pipe(csv())
            .on('data', (data) => {
                console.log(list.length);
                list.push(data)
            })
            .on('end', () => resolve(list))
    })
}

const makeCoffee = async () => {
    console.time('script')
    // const list = await getFileJSON()
    const list = [{ ClientId: "6479acf3e256713da8396163" }]
    for (let i = 0; i < list.length; i++) {
        const data = list[i];

        const client = await clientsRepo.getClientById(data['ClientId'])

        if (client) {

            const locations = await clientLocationRepo.getClientLocationByClientId(client._id)

            for (let l = 0; l < locations.length; l++) {
                const location = locations[l];

                const invoice = await invoiceRepo.getLastOne({
                    "payloadCalculated.locations.locationId": location._id.toString(),
                    "payloadCalculated.refund": false,
                    "payloadCalculated.locations.globalAction": 1
                })

                const transactionsCount = await transactionsRepo.getClientTransactionsCount(client._id)

                const locationIndex = invoice.payloadCalculated.locations.findIndex(x => x.locationId === location._id.toString())

                if (transactionsCount > 1) {
                    // const transaction = await transactionsRepo.getTransactionByInvoiceId(invoice._id)

                    const expireDate = invoice.payloadCalculated.locations[locationIndex].packages[0].expireNew

                    const locationExpireDate = location.subscriptionExpireDate

                    if (expireDate && locationExpireDate) {
                        location.subscriptionExpireDate = expireDate
                    }

                    const updatedLocation = client.info.locations.map(loc => {
                        if (loc.login === location.login) loc.subscriptionExpireDate = expireDate
                        return loc
                    })

                    client.info.locations = updatedLocation
                    await Promise.all([
                        invoiceRepo.updateInvoiceById(invoice._id, invoice),
                        clientLocationRepo.updateLocationById(location._id, location),
                        locationsUpdate(client._id),
                        client.save(),
                        clientsUpdate({
                            _id: client._id
                        })
                    ])
                } else {
                    //   const payloadCalculatedLocations = invoice.payloadCalculated.locations.map(x => {
                    //     x.packages = x.packages.map(item => {
                    //         if (item.expireNew) {
                    //             item.expireNew = location.subscriptionExpireDate
                    //         }

                    //         const subscription = subscriptionRepo.getOne({
                    //             package: item.packageId,
                    //             client: client._id,
                    //             location: location._id
                    //         }).then(data => {
                    //             data.expireDate = location.subscriptionExpireDate
                    //             return data
                    //         })

                    //         subscriptionRepo.updateAll({ _id: subscription._id }, subscription)
                    //         return item

                    //     })
                    //     return x
                    // })
                    // invoice.payloadCalculated.locations = payloadCalculatedLocations
                }
            }

        }

    }
    console.timeEnd('script')

}

const makeCanceledToInactive = async () => {
    console.time('wirte');
    const clients = await clientsRepo.getAll({
        "info.locations.subscriptionState": { $in: [0, 2] }
    })

    for (let i = 0; i < clients.length; i++) {
        const client = clients[i];
        console.log(i);
        const locations = await clientLocationRepo.getAll({
            login: { $in: client.info.locations.map(x => x.login) }
        })

        for (let l = 0; l < locations.length; l++) {
            const location = locations[l];

            const index = client.info.locations.findIndex(z => z.login === location.login)


            if ([0, 2].includes(location.subscriptionState)) {
                location.subscriptionState = client.info.locations[index].subscriptionState
                location.subscriptionExpireDate = client.info.locations[index].subscriptionExpireDate
                subscriptionRepo.updateAll({ location: location._id }, { state: 2, isActive: false })
            } else {
                const invoice = await invoiceRepo.getLast({
                    "payloadCalculated.locations.locationId": location._id.toString(),
                    payed: { $ne: 0 }
                })

                if (invoice) {
                    const invoiceLocationIndex = invoice.payloadCalculated.locations.findIndex(x => x.locationId === location._id.toString())

                    if (invoice.payloadCalculated.refund) {
                        //! make refund functionality
                        const subscrtiptionsIdList = []
                        invoice.payloadCalculated.locations[invoiceLocationIndex].packages.forEach(x => {
                            subscrtiptionsIdList.push(x.packageId)
                        })
                        let fl = { location: location._id }
                        const listed = subscrtiptionsIdList.map(b => ({ package: b }))
                        if (listed.length) {
                            fl['$or'] = listed
                        }

                        const subscriptions = await subscriptionRepo.getAllLastSubscriptions(fl, subscrtiptionsIdList.length)

                        await Promise.all(subscriptions.map(il => subscriptionRepo.updateAll({ _id: il._id }, { state: 2, isActive: false })))

                        location.subscriptionState = client.info.locations[index].subscriptionState

                        await locationsUpdate(client._id)
                    } else if (invoice.payloadCalculated.locations[invoiceLocationIndex].globalAction === 3) {
                        //! unavailable case
                        locationsUpdate(client._id).then(() => clientsUpdate({ _id: client._id }))
                    }
                } else {
                    location.subscriptionState = client.info.locations[index].subscriptionState
                    location.subscriptionExpireDate = client.info.locations[index].subscriptionExpireDate
                }
                // else {

                //     const packages = []
                //     const packagesRemoves = []

                //     invoice.payloadCalculated.locations[invoiceLocationIndex].packages.forEach(x => {
                //         if (!invoice.payloadCalculated.locations[invoiceLocationIndex].packagesRemoves.includes(x.packageId)) {
                //             if (!x.canceled) {
                //                 packages.push(x.packageId)
                //             }
                //         } else {
                //             packagesRemoves.push(x.packageId)
                //         }
                //     })

                //     const [actives, removes] = await Promise.all([
                //         subscriptionRepo.getAllLastSubscriptions({
                //             location: location._id,
                //             $or: packages.map(b => ({ package: b }))
                //         }, packages.length),
                //         subscriptionRepo.getAllLastSubscriptions({
                //             location: location._id,
                //             $or: packagesRemoves.map(b => ({ package: b }))
                //         }, packagesRemoves.length)
                //     ])

                //     if (removes.length) {
                //         await subscriptionRepo.updateAll({ package: { $in: removes }, location: location._id }, { state: 2, isActive: false })
                //     }

                //     if (actives.length) {
                //         //? set actives
                //     }
                // }
            }



            await clientLocationRepo.update({ _id: location._id }, { subscriptionState: location.subscriptionState, subscriptionExpireDate: location.subscriptionExpireDate })


        }

    }
    console.timeEnd('wirte');

}


const hasClientRefund = (invoices) => {
    const refundInvoices = invoices.filter(x => x.payloadCalculated.refund)
    return !!refundInvoices.length
}

const makeFullRefund = async (client, locationId, invoice) => {
    const invoicePayloadCalculatedlocation = invoice.payloadCalculated.locations.map(item => {
        item.packages = item.packages.map(package => {
            if (package.expireNew) package.expireNew = invoice.createdAt
            if (package.expireDate) package.expireDate = invoice.createdAt            
            return package
        })
        return item
    })

    invoice.payloadCalculated.locations = invoicePayloadCalculatedlocation

    const clientInfoLocation = client.info.locations.map(item => {
        item.subscriptionState = 2
        item.subscriptionExpireDate = invoice.createdAt
        return item
    })

    client.info.locations = clientInfoLocation

    await Promise.all([
        clientsRepo.updateAll({ _id: client._id }, client),
        invoiceRepo.updateInvoiceById(invoice._id, { payloadCalculated: invoice.payloadCalculated }),
        clientLocationRepo.updateClientLocationById(locationId, {
            subscriptionExpireDate: invoice.createdAt,
            subscriptionCancelDate: invoice.createdAt
        })
    ])

}

const setInvoiceDataToLocationAndClient = async (client, location, invoice) => {
    
    for (let i = 0; i < invoice.payloadCalculated.locations.length; i++) {
        const invoiceLocation = invoice.payloadCalculated.locations[i];
        if (invoiceLocation.locationId === location._id.toString()) {
            let updateBody = {}
            updateBody.subscriptionExpireDate = invoiceLocation.packages[0]?.expireNew || invoiceLocation.packages[0]?.expireDate
            await clientLocationRepo.update({ _id: location._id }, updateBody)


            const clientLocation = [], activePackages = 0
            for (let clientInfoLocationIndex = 0; clientInfoLocationIndex < client.info.locations.length; clientInfoLocationIndex++) {
                const clientInfoLocation = client.info.locations[clientInfoLocationIndex];
                if (clientInfoLocation.login === location.login) {
                    clientInfoLocation.subscriptionExpireDate = invoiceLocation.packages[0]?.expireNew || invoiceLocation.packages[0]?.expireDate
                    clientInfoLocation.subscriptionState = location.subscriptionState
                }

                clientLocation.push(clientInfoLocation)
            }
            await clientsRepo.updateClientById(client._id, { info: { activePackages, locations: clientLocation } })
        }
    }

    return true
}

const isPrevPackageExpired = async (package, maxExpire) => {
    return moment(package.expireNew).isAfter(maxExpire)
}

const recalculateInvoices = async (invoices) => {
    let list = invoices.slice().reverse()

    if (invoices.length > 1) {
        for (let i = 0; i < list.length; i++) {
            const x = i
            const prevInvoice = list[i];
            const currentInvoice = list[x+1]

            if (currentInvoice) {

            const invoicePayloadCalculatedLocations = []
            for (let index = 0; index < currentInvoice.payloadCalculated.locations.length; index++) {
                const currentInvoiceLocation = currentInvoice.payloadCalculated.locations[index];
                const prevInvoiceLocationIndex = prevInvoice.payloadCalculated.locations.findIndex(x => x.locationId === currentInvoiceLocation.locationId)

                if (prevInvoiceLocationIndex > -1) {
                    const prevInvoicelocation = prevInvoice.payloadCalculated.locations[prevInvoiceLocationIndex]
                    const currentInvoiceDuration = currentInvoiceLocation.month || currentInvoiceLocation.day
                    const durationType = currentInvoiceLocation.month ? 'months' : 'days'
                    const isCurrentInvoiceRefund = currentInvoice.payloadCalculated.refund

                    const globalAction = currentInvoiceLocation.globalAction
                    const subscribeToDate = currentInvoiceLocation.subscribeToDate

                    if (!isCurrentInvoiceRefund) {
                        
                        currentInvoiceLocation.packages = currentInvoiceLocation.packages.map(pack => {
                            if (globalAction === 3) pack.expireNew = subscribeToDate 
                            else {
                                const prevPackageIndex = prevInvoicelocation.packages.findIndex(o => o.packageId === pack.packageId)
                                if (prevPackageIndex > -1) {
                                    const prevPackage = prevInvoicelocation.packages[prevPackageIndex]
                                    const prevPackageExpireDate = prevInvoice.payloadCalculated.refund || isPrevPackageExpired(prevPackage, currentInvoice.createdAt) ? currentInvoice.createdAt : prevPackage.expireNew 
                                        || new Date(moment(prevPackage.startDate || prevInvoice.createdAt).add(prevInvoicelocation.month || prevInvoicelocation.day, prevInvoicelocation.day ? 'days' : 'months'))
                                    const currentInvoiceExpireNewDate = new Date(moment(prevPackageExpireDate).add(currentInvoiceDuration, durationType))
                                    pack.expireNew = currentInvoiceExpireNewDate
                                }
                            }

                            return pack
                        })

                    } else {
                        currentInvoiceLocation.packages = currentInvoiceLocation.packages.map(pack => {
                            if (globalAction === 3) pack.expireNew = subscribeToDate 
                            else pack.expireNew = currentInvoice.createdAt
                            return pack
                        }) 
                    }

                }

                invoicePayloadCalculatedLocations.push(currentInvoiceLocation)

            }
                currentInvoice.payloadCalculated.locations = invoicePayloadCalculatedLocations
                await invoiceRepo.updateInvoicePayload(currentInvoice._id, currentInvoice.payloadCalculated)
            }

        }            
    }

}

const updateSubscriptionsLocationAndClient = async (locationId) => {
    const invoice = await invoiceRepo.getLast({
        "payloadCalculated.locations.locationId": locationId,
        "payloadCalculated.locations.packages.packageId": { $exists: true },
        payed: { $ne: 0 }
    })

    if (invoice) {
        const packagesList = []
        invoice.payloadCalculated.locations.forEach(x => x.packages.forEach(pack => {
            if (!packagesList.includes(pack.packageId)) packagesList.push(pack.packageId)
        }))
    
        const subscriptions = await subscriptionRepo.getAllLastSubscriptions({
            location: locationId,
            $or: packagesList.map(o => ({ package: o }))
        }, packagesList.length)
    
        const location = await clientLocationRepo.getById(locationId)
    
        for (let j = 0; j < invoice.payloadCalculated.locations.length; j++) {
            const locations = invoice.payloadCalculated.locations[j];
    
            for (let k = 0; k < locations.packages.length; k++) {
                const package = locations.packages[k];
    
                if (locations.locationId === location._id.toString()) {
                    location.subscriptionExpireDate = package.expireNew
                    await clientLocationRepo.update({ _id: location._id }, {
                        subscriptionExpireDate: package.expireNew
                    })
                }
    
                for (let i = 0; i < subscriptions.length; i++) {
                    const subscription = subscriptions[i];
                    const state = moment().isBefore(package.expireNew) ? 1 : 2
                    await subscriptionRepo.updateAll({ _id: subscription._id }, { endDate: package.expireNew, state, isActive: state === 1 })
                }
            }
        }
    
        
        const client = await clientsRepo.getClientById(location.clientId)
        let activePackages = client.info.activePackages,
            clientLocations = []
    
        for (let p = 0; p < client.info.locations.length; p++) {
            const element = client.info.locations[p];
            if (element.login === location.login) {
                element.subscriptionExpireDate = location.subscriptionExpireDate
            }
            clientLocations.push(element)
        }
    
        await clientsRepo.updateClientById(client._id, { info: { activePackages, locations: clientLocations } })
    }

}

const refundLocationsUpdate = async () => {
    console.time('script_start');
    let fullRefundCount = 0, setInvoiceToAllCount = 0, recalculateCount = 0, oneIvoiceUpdatedCount = 0
    const locations = await clientLocationRepo.getAll({})
    for (let i = 0; i < locations.length; i++) {
        console.log(i, ' from ', locations.length);
        const location = locations[i];
        const invoices = await invoiceRepo.getAll({
            "payloadCalculated.locations.locationId": location._id.toString(),
            "payloadCalculated.locations.packages.packageId": { $exists: true },
            payed: { $ne: 0 }
        }, { createdAt: -1 }, ["location", "client"])
        const isClientHasRefund = hasClientRefund(invoices)

        if (invoices.length) {

            if (invoices.length === 1) {

                const locationUpdated = invoices[0].payloadCalculated.locations.map(item => {
                    item.packages = item.packages.map(elem => {

                        const duration = item.month || item.day
                        const durationType = item.month ? 'months' : 'days'

                        const newExpireDate = new Date(moment(invoices[0].createdAt).add(duration, durationType))

                        if (!item.subscribeToDate && item.globalAction !==3) {
                            elem.expireNew = newExpireDate
                        } else {
                            elem.expireNew = item.subscribeToDate
                        }

                        return elem
                    })

                    return item
                })

                invoices[0].payloadCalculated.locations = locationUpdated

                await invoiceRepo.updateInvoicePayload(invoices[0]._id, invoices[0].payloadCalculated)
                await updateSubscriptionsLocationAndClient(location._id.toString())
                await locationsUpdate({ body: { client: location.clientId } }, { send: () => {} })
                await clientsUpdate({ body: { client: location.clientId } }, { send: () => {} })
                await updateClientInfo({ body: { client: location.clientId } }, { send: () => {} })
                oneIvoiceUpdatedCount++
            } else if (isClientHasRefund) {
                const lastInvoice = invoices[0]
                
                if (lastInvoice) {
                    if (lastInvoice.payloadCalculated.refund){
                        await makeFullRefund(lastInvoice.client, location._id, lastInvoice)
                        fullRefundCount++
                    }
                    else {
                        await recalculateInvoices(invoices)
                        await updateSubscriptionsLocationAndClient(location._id.toString())
                        await locationsUpdate({ body: { client: location.clientId } }, { send: () => {} })
                        await clientsUpdate({ body: { client: location.clientId } }, { send: () => {} })
                        await updateClientInfo({ body: { client: location.clientId } }, { send: () => {} })
                        recalculateCount++
                    }
                }
                
            } else {
                await setInvoiceDataToLocationAndClient(invoices[0].client, location, invoices[0])
                setInvoiceToAllCount++
            }
        } else {
            const subscriptions = await subscriptionRepo.getALl({ location: location._id })
            const usedPackages = []

            for (let k = 0; k < subscriptions.length; k++) {
                const subscription = subscriptions[k];
                if (!usedPackages.includes(subscription.package.toString())) {
                    usedPackages.push(subscription.package.toString())

                    subscription.endDate = location.subscriptionExpireDate

                    if (moment(location.subscriptionExpireDate).isAfter(moment())) {
                        if (location.subscriptionCancelDate && (moment(location.subscriptionCancelDate).isBetween(subscription.startDate, location.subscriptionExpireDate))) {
                            subscription.state = 2
                            subscription.isActive = false
                        } else {
                            subscription.state = 1
                            subscription.isActive = true
                        }
                    }

                    await subscriptionRepo.updateAll({_id: subscription._id}, {
                        state: subscription.state,
                        isActive: subscription.isActive,
                        endDate: subscription.endDate
                    }) //!
                    await locationsUpdate({ body: { client: subscription.client } }, { send: () => {} })
                    await clientsUpdate({ body: { client: subscription.client } }, { send: () => {} })
                    await updateClientInfo({ body: { client: subscription.client } }, { send: () => {} })
                }
            }

        }

    }
    console.log("oneIvoiceUpdatedCount - ", oneIvoiceUpdatedCount);
    console.log("fullRefundCount - ", fullRefundCount)
    console.log("setInvoiceToAllCount - ", setInvoiceToAllCount),
    console.log("recalculateCount - ", recalculateCount);
    console.timeEnd('script_start');

}

const removeWrongPackages = async () => {
    console.time('invoice')
    const invalidPackages = ["64579b471c5b7b1510f82395", "64579b471c5b7b1510f822e1"]
    const invoices = await invoiceRepo.getAll({
        "payloadCalculated.locations.packages.packageId": { $in: invalidPackages }
    })

    for (let i = 0; i < invoices.length; i++) {
        console.log(i, ' from ', invoices.length);
        const invoice = invoices[i];
        const locations = invoice.payloadCalculated.locations.map(location => {
            const packages = []
            location.packages.map(package => {
                if (invalidPackages.includes(package.packageId)) {
                    if (!location.packageRemoves || !Array.isArray(location.packageRemoves)) locations.packageRemoves = []
                    location.packageRemoves.push(package.packageId)
                } else packages.push(package)
            })
            location.packages = packages
            return location
        })

        invoice.payloadCalculated.locations = locations
        await invoiceRepo.updateInvoicePayload(invoice._id, invoice.payloadCalculated)
    }
    console.timeEnd('invoice')
}

const mountPendingLocations = async () => {
    console.time('script')
    const locations = await clientLocationRepo.getAll({
        subscriptionState: 1
    })

    let updatedCount = 0

    for (let i = 0; i < locations.length; i++) {
        const location = locations[i];
        console.log(`${i} from ${locations.length}`);
        const subscriptions = await subscriptionRepo.getALl({
            location: location._id,
            state: 1
        })

        const paylod = subscriptions[0]

        if (paylod) {

            const cond1 = moment(location._doc.subscriptionPendingDate).isBetween(paylod.startDate, paylod.endDate)
            console.log(`client__ ${paylod.client.toString()}`);
            updatedCount++

            await subscriptionRepo.updateSubscriptionById(paylod._id, { isActive: true }),
            await clientLocationRepo.update({ _id: location._id }, { subscriptionState: 3, subscriptionActivationDate: paylod.startDate })

        }
        
    }

    console.log(`updated ${updatedCount} from ${locations.length}`);
    console.timeEnd('script')
}


const valueOfActivityFails = async () => {
    const locations = await clientLocationRepo.getAll({ subscriptionState: 0 })

    for (let i = 0; i < locations.length; i++) {
        const lcoation = locations[i];
        


    }

}

module.exports = {
    run: mountPendingLocations,
    inject: inject,
    run1: locationsUpdate,
    run2: clientsUpdate,
    run3: updateClientInfo,
    run4: mountPendingLocations,
    run5: locationsUpdateAll,
    run6: clientsUpdateAll,
    run7: updateClientInfoAll,
    run8: refundLocationsUpdate
}

