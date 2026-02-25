import functions from "firebase-functions";
import { app } from "./app.js";
export const api = functions.https.onRequest(app);
