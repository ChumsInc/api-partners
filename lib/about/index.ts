import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import process from 'node:process';
import {Request, Response} from 'express';
import Debug from 'debug';
import {ValidatedUser} from "chums-local-modules";
import {User} from "chums-types";

const debug = Debug('chums:lib:about');

export interface PackageJSON {
    name: string;
    version: string;
}

async function loadAPIVersion() {
    try {
        let version = '0.0.0';
        const path = resolve(process.cwd(), './package.json');
        const contents = await readFile(path);
        if (contents) {
            const json: PackageJSON = JSON.parse(contents.toString());
            version = json?.version ?? 'unknown version';
        }

        return version;
    } catch (err: unknown) {
        if (err instanceof Error) {
            console.debug("loadAPIVersion()", err.message);
            return Promise.reject(err);
        }
        console.debug("loadAPIVersion()", err);
        return Promise.reject(new Error('Error in loadAPIVersion()'));
    }
}

export const aboutAPI = async (req: Request, res: Response):Promise<void> => {
    try {
        const version = await loadAPIVersion();
        res.json({site: '/api/partners', version});
    } catch(err:unknown) {
        if (err instanceof Error) {
            debug("aboutAPI()", err.message);
            res.status(500).json({error: err.message, name: err.name});
            return;
        }
        res.status(500).json({error: 'unknown error in aboutAPI'});
    }
}

export const aboutMe = async (req: Request, res: Response<unknown, ValidatedUser>):Promise<void> => {
    res.json({locals: (res.locals.auth.profile!.user as User).email ?? res.locals.auth.profile!.user.id});
}
