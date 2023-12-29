import Express from "express-serve-static-core";
import { User } from "../custom";

declare global {
  module Express {
    export interface Request {
      user?: any; // User
    }
  }
}
