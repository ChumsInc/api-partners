import {Request} from "express";
import {UserValidation} from "chums-local-modules";

export interface AuthorizedRequest extends Request {
    userAuth: UserValidation;
}
