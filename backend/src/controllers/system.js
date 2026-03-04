import systemService from '../services/system/systemService.js';

export const getSettings = async (req, res, next) => {
    try {
        const settings = await systemService.getSettings();
        res.status(200).json({ success: true, data: settings });
    } catch (error) {
        next(error);
    }
};

export const updateSettings = async (req, res, next) => {
    try {
        const updated = await systemService.updateSettings(req.body);
        res.status(200).json({ success: true, data: updated });
    } catch (error) {
        next(error);
    }
};
