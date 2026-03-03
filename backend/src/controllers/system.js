const systemService = require('../services/system/systemService');

exports.getSettings = async (req, res, next) => {
    try {
        const settings = await systemService.getSettings();
        res.status(200).json({ success: true, data: settings });
    } catch (error) {
        next(error);
    }
};

exports.updateSettings = async (req, res, next) => {
    try {
        const updated = await systemService.updateSettings(req.body);
        res.status(200).json({ success: true, data: updated });
    } catch (error) {
        next(error);
    }
};
