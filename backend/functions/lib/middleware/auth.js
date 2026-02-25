import { getAuth } from "firebase-admin/auth";
import { initializeAdmin } from "../services/firestore.js";
export async function requireAuth(req, res, next) {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
        res.status(401).json({ error: "missing_auth" });
        return;
    }
    const token = header.slice("Bearer ".length);
    try {
        initializeAdmin();
        const decoded = await getAuth().verifyIdToken(token);
        req.user = { uid: decoded.uid, email: decoded.email };
        next();
    }
    catch (err) {
        console.error(err);
        res.status(401).json({ error: "invalid_auth" });
    }
}
