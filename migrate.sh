#!/bin/sh
npx knex migrate:latest --knexfile ./Knexfile.js --env development
