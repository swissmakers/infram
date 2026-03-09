const { Router } = require("express");
const { isAdmin } = require("../middlewares/permission");
const { validateSchema } = require("../utils/schema");
const { getStatusCheckerSettings, updateStatusCheckerSettings } = require("../controllers/statusChecker");
const { updateStatusCheckerSettingsValidation } = require("../validations/statusChecker");

const app = Router();

app.get("/settings/global", isAdmin, async (req, res) => {
    const settings = await getStatusCheckerSettings();
    if (settings?.code) return res.status(settings.code).json(settings);
    res.json(settings);
});

app.patch("/settings/global", isAdmin, async (req, res) => {
    if (validateSchema(res, updateStatusCheckerSettingsValidation, req.body)) return;
    const updatedSettings = await updateStatusCheckerSettings(req.body);
    if (updatedSettings?.code) return res.status(updatedSettings.code).json(updatedSettings);
    res.json(updatedSettings);
});

module.exports = app;
