
const knex = require('knex');
const knexConfigs = require('../../db.pg');


async function seed(pg) {
    try {


        // Seed data for the 'conversations' table
       
        // Insert seed entries

        await pg('providers').insert([
            {
                deleted: false,
                name: 'Provider A'
            },
            {
                deleted: false,
                name: 'Provider B'
            }
        ]);
        await pg('conversations').insert([

            {
                name: 'Project Team',
                type: 'group',
                provider: 1,
                members: JSON.stringify([1, 2, 3, 4]), // Stringify members array
                deleted: 0,
                deleted_at: null
            },
            {
                name: 'John and Jane',
                type: 'single',
                provider: 2,
                members: JSON.stringify([5,6]), // Stringify members array
                deleted: 0,
                deleted_at: null
            }

        ]);

        // await pg('chat_members').insert([
        //     {
        //         user_id: '1',
        //         client_id: '123456',
        //         provider: 'Company A',
        //         avatar: 'https://example.com/avatar1.jpg',
        //         name: 'John Doe',
        //         phones: ['123-456-7890', '987-654-3210']
        //     },
        //     {
        //         user_id: '2',
        //         client_id: '789012',
        //         provider: 'Company B',
        //         avatar: 'https://example.com/avatar2.jpg',
        //         name: 'Jane Smith',
        //         phones: ['555-555-5555']
        //     }
        // ]);


        // await pg('messages').insert([
        //     {
        //         conversation: 1,
        //         author: 1,
        //         files: ['https://example.com/file1.pdf'],
        //         provider: 'Messenger',
        //         message: 'Hello, how are you?',
        //         reply_from: null,
        //         seen_by: 2,
        //         deleted: 0,
        //         deleted_at: null,
        //         edited: 0,
        //         edited_at: null
        //     },
        //     {
        //         conversation: 2,
        //         author: 2,
        //         files: ['https://example.com/image1.jpg'],
        //         provider: 'WhatsApp',
        //         message: 'Nice to meet you!',
        //         reply_from: null,
        //         seen_by: 1,
        //         deleted: 0,
        //         deleted_at: null,
        //         edited: 0,
        //         edited_at: null
        //     }
        // ]);
        await pg('participants').insert([
            {
                phones: JSON.stringify(['123-456-7890', '987-654-3210']), // Stringify phones array
                provider: 'WhatsApp',
                participant_type: 'individual',
                client: 'Company A'
            },
            {
                phones: JSON.stringify(['555-555-5555']), // Stringify phones array
                provider: 'Messenger',
                participant_type: 'group',
                client: 'Company B'
            }
        ]);

 

        await pg('clients').insert([
            {
                provider: 1 // Assuming the ID of the provider from the 'providers' table
            },
            {
                provider: 2 // Assuming the ID of another provider from the 'providers' table
            }
        ]);

        await pg('invoices').insert([
            {
                provider: 1 // Assuming the ID of the provider from the 'providers' table
            },
            {
                provider: 2 // Assuming the ID of another provider from the 'providers' table
            }
        ]);
        await pg('transactions').insert([
            {
                number: 'TRX-001',
                client: 1, // Assuming client ID
                provider: 1, // Assuming provider ID
                invoice: 1 // Assuming invoice ID
            },
            {
                number: 'TRX-002',
                client: 2, // Assuming another client ID
                provider: 2, // Assuming another provider ID
                invoice: 2 // Assuming another invoice ID
            }
        ]);
        await pg('users').insert([
            {
                mongo_id: '123456',
                firstname: 'John',
                lastname: 'Doe',
                email: 'john@example.com',
                password: 'hashed_password'
            },
            {
                mongo_id: '789012',
                firstname: 'Jane',
                lastname: 'Doe',
                email: 'jane@example.com',
                password: 'hashed_password'
            }
        ]);
        // await pg('client_emails').insert([
        //     {
        //         email: 'client1@example.com',
        //         client: 1 // Assuming client ID
        //     },
        //     {
        //         email: 'client2@example.com',
        //         client: 2 // Assuming another client ID
        //     }
        // ]);
        // await pg('client_phones').insert([
        //     {
        //         phone: '123-456-7890',
        //         client: 1 // Assuming client ID
        //     },
        //     {
        //         phone: '987-654-3210',
        //         client: 2 // Assuming another client ID
        //     }
        // ]);
        // await pg('client_locations').insert([
        //     {
        //         login: 'client1_login',
        //         password: 'client1_password',
        //         client: 1 // Assuming client ID
        //     },
        //     {
        //         login: 'client2_login',
        //         password: 'client2_password',
        //         client: 2 // Assuming another client ID
        //     }
        // ]);
        // await pg('conversation_members').insert([
        //     {
        //         conversation: 1, // Assuming conversation ID
        //         chat_member: 1 // Assuming chat member ID
        //     },
        //     {
        //         conversation: 2, // Assuming another conversation ID
        //         chat_member: 2 // Assuming another chat member ID
        //     }
        // ]);

          
  } catch (error) {
    console.error('Error seeding data:', error);
  }
}

// async function init() {
//     try {
//       const pg = knex(knexConfigs); // Pass the configuration object directly
//       await seed(pg);
//       console.log('Successfully seeded data.');
//     } catch (error) {
//       console.error('Error initializing seed:', error);
//     }
//   }

module.exports = { seed }; // Export the init function as a property of an object


