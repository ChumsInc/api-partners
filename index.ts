import DotEnv from 'dotenv';
const dotenv  = DotEnv.config();
if (dotenv.error) {
    console.log('*** error loading .env', dotenv.error);
    process.exit(1);
}

import Debug from 'debug';
const debug = Debug('chums:index');

import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';
import http from 'http';
import compression from 'compression';
import path from 'path';
import libRouter from './lib';


const app = express();
app.set('trust proxy', 'loopback');
app.set('json spaces', 2);
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, '/views'));

app.use(compression());
app.use(helmet());
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.use(libRouter);

const {PORT, NODE_ENV} = process.env;
const server = http.createServer(app);
server.listen(PORT);
debug(`server started on port: ${PORT}; mode: ${NODE_ENV}`);
