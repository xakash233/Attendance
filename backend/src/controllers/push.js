import {
    getVapidPublicKey,
    removePushSubscription,
    savePushSubscription
} from '../services/push/webPushService.js';
import { getMyLiveStatus } from '../services/attendance/outBreakMonitorService.js';

export const getPushPublicKey = async (req, res) => {
    const publicKey = getVapidPublicKey();
    if (!publicKey) {
        return res.status(503).json({ message: 'Push notifications are not configured on the server.' });
    }

    res.json({ publicKey });
};

export const subscribePush = async (req, res, next) => {
    try {
        await savePushSubscription(req.user.id, req.body);
        res.status(201).json({ message: 'Push subscription saved.' });
    } catch (error) {
        next(error);
    }
};

export const unsubscribePush = async (req, res, next) => {
    try {
        await removePushSubscription(req.user.id, req.body?.endpoint);
        res.json({ message: 'Push subscription removed.' });
    } catch (error) {
        next(error);
    }
};

export const getMyAttendanceStatus = async (req, res, next) => {
    try {
        const status = await getMyLiveStatus(req.user.id);
        if (!status) {
            return res.status(404).json({ message: 'User not found.' });
        }

        res.json(status);
    } catch (error) {
        next(error);
    }
};
