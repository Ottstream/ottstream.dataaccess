#!/bin/sh
npx knex migrate:make $1 --knexfile ./Knexfile.js
