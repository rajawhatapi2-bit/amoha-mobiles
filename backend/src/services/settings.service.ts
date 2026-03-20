import SiteSettings, { ISiteSettings } from '../models/settings.model';

class SettingsService {
  async get(): Promise<ISiteSettings> {
    let settings = await SiteSettings.findOne();
    if (!settings) {
      settings = await SiteSettings.create({});
    }
    return settings;
  }

  async update(data: Partial<ISiteSettings>): Promise<ISiteSettings> {
    let settings = await SiteSettings.findOne();
    if (!settings) {
      settings = await SiteSettings.create(data);
    } else {
      Object.assign(settings, data);
      await settings.save();
    }
    return settings;
  }
}

export default new SettingsService();
