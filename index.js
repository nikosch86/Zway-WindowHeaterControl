/*** WindowHeaterControl Z-Way HA module *******************************************

 Version: 0.01
 (c) Nikolaus Schuster, 2015
 -----------------------------------------------------------------------------
 Author: Nikolaus Schuster <office@lastverteiler.net>
 Description:
 Manages Window Heating Element based on various factors to avoid condensation

 ******************************************************************************/

function WindowHeaterControl (id, controller) {
  // Call superconstructor first (AutomationModule)
  WindowHeaterControl.super_.call(this, id, controller);

  this.interval           = undefined;
  this.weatherDevice      = undefined;
  this.moduleName         = 'WindowHeaterControl';
  this.sensors            = [];
  this.last_on             = undefined;
  this.last_off            = undefined;
  this.maxOn              = 60*60;
  this.sleepTime          = 60*30;
  this.heaterStatus       = undefined;
  this.debugMode          = true;
}

inherits(WindowHeaterControl, AutomationModule);

_module = WindowHeaterControl;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

WindowHeaterControl.prototype.init = function init(config) {
  WindowHeaterControl.super_.prototype.init.call(this, config);

  var self = this;
  var langFile = self.controller.loadModuleLang(this.moduleName);
  var icon;

  // Create vdev
  if (config['heater_active'] === true) {
    icon = '/ZAutomation/api/v1/load/modulemedia/' + this.moduleName + '/icon_heater_off.png';
  } else {
    icon = '/ZAutomation/api/v1/load/modulemedia/' + this.moduleName + '/icon_heater_disabled.png';
  }
  self['HeaterDevice'] = this.controller.devices.create({
    deviceId: this.moduleName + '_' + self.id,
    defaults: {
      metrics: {
        probeTitle: 'controller',
        title: langFile['heater_active_label'],
        level: 'off',
        icon: icon
      }
    },
    handler: _.bind(self.commandDevice,self),
    overlay: {
      deviceType: 'switchBinary'
    },
    moduleId: self.id
  });
  self.log('instantiated and created device');
  self.maxOn = parseInt(self.config.max_on)*60;
  self.sleepTime = parseInt(self.config.sleep_time)*60;
  if (config['heater_active'] === true) {
    var checkInterval = parseInt(self.config.check_interval);
    self.log('checking conditions every '+checkInterval+' minutes');
    self.interval = setInterval(_.bind(self.controlHeater,self),1000*60*checkInterval);
    setTimeout(_.bind(self.controlHeater,self),1000*60);
  }
};

WindowHeaterControl.prototype.log = function log(msg) {
  var self = this;

  if (undefined === msg) {
    return;
  }
  if (null !== log.caller) {
    console.log('['+self.moduleName+'_'+self.id+'] ['+log.caller.name+'] '+msg);
  } else {
    console.log('['+self.moduleName+'_'+self.id+'] '+msg);
  }
};

WindowHeaterControl.prototype.debug = function debug(msg) {
  var self = this;

  if (undefined === msg) {
    return;
  }
  if (self.debugMode !== true) {
    return;
  }
  if (null !== debug.caller) {
    console.debug('['+self.moduleName+'_'+self.id+'] ['+debug.caller.name+'] '+msg);
  } else {
    console.debug('['+self.moduleName+'_'+self.id+'] '+msg);
  }
};

WindowHeaterControl.prototype.error = function error(msg) {
  var self = this;

  if (undefined === msg) {
    return;
  }
  if (null !== error.caller) {
    console.error('['+self.moduleName+'_'+self.id+'] ['+error.caller.name+'] '+msg);
  } else {
    console.error('['+self.moduleName+'_'+self.id+'] '+msg);
  }
};

WindowHeaterControl.prototype.stop = function () {
  var self = this;

  self.last_off = self.getTimestamp();
  self.switchHeater('off');

  var key = 'HeaterDevice';
  if (typeof(self[key]) !== 'undefined') {
    self.controller.devices.remove(self[key].id);
    self[key] = undefined;
  }

  if (typeof(self.interval) !== 'undefined') {
    clearInterval(self.interval);
    self.interval = undefined;
  }

  WindowHeaterControl.super_.prototype.stop.call(this);
};

WindowHeaterControl.prototype.commandDevice = function(command) {
  var self = this;

};

WindowHeaterControl.prototype.switchHeater = function switchHeater(command) {
  var self = this;

  if (command === 'on' || command === 'off') {
    self['HeaterDevice'].set('metrics:level',command);
    self['HeaterDevice'].set('metrics:icon','/ZAutomation/api/v1/load/modulemedia/WindowHeaterControl/icon_heater_'+command+'.png');
  }
  if (command === 'on') {
    if (self.config.heater_active != 1) {
      self.log('Skipping sending command '+command+' to heater device since heating is disabled');
      return;
    }
  }

  var heaterDevice = self.controller.devices.get(self.config.heater_device);
  if (null === heaterDevice) {
    self.error('could not enumerate heater device "'+self.config.heater_device+'"');
    return;
  }

  if (heaterDevice.get('deviceType') == 'switchBinary') {
    self.log('turning heater '+command);
    heaterDevice.performCommand(command);
    self.heaterStatus = command;
  } else {
    self.error('heaterDevice "'+self.config.heater_device.toString()+'" is not a switchBinary deviceType but '+heaterDevice.get('deviceType'));
  }

};

WindowHeaterControl.prototype.checkConditions = function checkConditions() {
  var self = this;
  var target;
  var current = self.getTimestamp();

  self.log('checking Conditions');
  var sensors = {
    temperature_inside: undefined,
    temperature_outside: undefined,
    humidity_outside: undefined,
    light_inside: undefined,
    condition: undefined
  };
  _.each(sensors, function sensorQueryLoop(value, sensor) {
    sensors[sensor] = self.getSensorData(sensor);
    if (typeof(sensor) === 'undefined') {
      self.error('Unable to query '+sensor);
      return;
    }
    self.log('sensor query for '+sensor+' returned '+sensors[sensor]);
  });
  sensors.temp_diff = (sensors.temperature_inside - sensors.temperature_outside);

  this.sensors = sensors;

  self.debug(self.sensors.light_inside+' >= '+parseInt(self.config.preconditions.light_low)+' && '+self.sensors.light_inside+' < '+parseInt(self.config.preconditions.light_high));
  self.debug(self.sensors.temp_diff+' > '+parseInt(self.config.preconditions.temp_diff_low)+' && '+self.sensors.temp_diff+' < '+parseInt(self.config.preconditions.temp_diff_high));
  self.debug(self.sensors.temperature_outside+' > '+parseInt(self.config.preconditions.out_temp_low)+' && '+self.sensors.temperature_outside+' < '+parseInt(self.config.preconditions.out_temp_high));
  self.debug(self.sensors.humidity_outside+' > '+parseInt(self.config.preconditions.out_humid_low)+' && '+self.sensors.humidity_outside+' < '+parseInt(self.config.preconditions.out_humid_high));
  self.debug(self.sensors.condition);

  var condensingConditions = ["rain", "snow", "snowgrains", "icecrystals", "icepellets", "hail", "mist", "rainshowers", "snowshowers", "hailshowers", "thunderstorm", "freezing"];

  if (
    ((self.sensors.light_inside >= parseInt(self.config.preconditions.light_low)) && (self.sensors.light_inside < parseInt(self.config.preconditions.light_high)))
    && ((self.sensors.temp_diff > parseInt(self.config.preconditions.temp_diff_low)) && (self.sensors.temp_diff < parseInt(self.config.preconditions.temp_diff_high)))
    && ((self.sensors.temperature_outside > parseInt(self.config.preconditions.out_temp_low)) && (self.sensors.temperature_outside < parseInt(self.config.preconditions.out_temp_high)))
    && ((self.sensors.humidity_outside > parseInt(self.config.preconditions.out_humid_low)) && (self.sensors.humidity_outside < parseInt(self.config.preconditions.out_humid_high)))
  ) {
    target = 'on';
  } else if (condensingConditions.indexOf(self.sensors.condition) > -1) {
    target = 'on';
  } else {
    target = 'off';
  }
  if (target != self.heaterStatus) {
    self['last_'+target] = current+2;
    self.switchHeater(target);
  }
};

WindowHeaterControl.prototype.controlHeater = function controlHeater() {
  var self = this;
  var target;

  var current = self.getTimestamp();

  if (undefined === self.last_on) {
    self.last_on = self.last_off = (current - (self.sleepTime + 1));
  }
  var timeOn = (current - self.last_on);

  var timeOff = (current - self.last_off);
  self.debug('last_on: '+self.last_on+' last_off: '+self.last_off+' maxOn: '+self.maxOn+' sleepTime: '+self.sleepTime);

  if (self.last_on > self.last_off && timeOn > self.maxOn) {
    self.log('Heater was on for '+Math.round(timeOn/60)+' / '+Math.round(self.maxOn/60)+' minutes, switching off');
    target = 'off';
  } else if (self.last_off >= self.last_on && timeOff > self.sleepTime) {
    self.log('Heater was sleeping for '+Math.round(timeOff/60)+' / '+Math.round(self.sleepTime/60)+' minutes, checking for preconditions');
  } else if (self.last_off >= self.last_on && timeOff < self.sleepTime) {
    self.log('Heater was sleeping for '+Math.round(timeOff/60)+' / '+Math.round(self.sleepTime/60)+' minutes, keeping off');
    target = 'off';
  }

  if (target == 'off') {
    if (target != self.heaterStatus) {
      self.last_off = current+1;
      self.switchHeater(target);
    }
    return;
  }
  if (self.config.heater_active) {
    self.checkConditions();
  }

};

WindowHeaterControl.prototype.getTimestamp = function getTimestamp() {
  if (!Date.now) {
    Date.now = function() { return new Date().getTime(); }
  }

  return Date.now() / 1000 | 0;
};

WindowHeaterControl.prototype.getConditionGroup = function() {
  var self = this;
  var weatherDevice = self.getWeatherDevice();
  return weatherDevice.get('metrics:conditiongroup');
};

WindowHeaterControl.prototype.getWeatherDevice = function() {
  var self = this;

  if (typeof(self.weatherDevice) === 'undefined') {
    self.controller.devices.each(function(vDev) {
      if (vDev.get('deviceType') === 'sensorMultilevel'
        && vDev.get('metrics:probeTitle') === 'WeatherUndergoundCurrent') {
        self.weatherDevice = vDev;
      }
    });
  }

  if (typeof(self.weatherDevice) === 'undefined') {
    self.error('Could not find Weather device');
  }

  return self.weatherDevice;
};

WindowHeaterControl.prototype.getSensorData = function getSensorData(type) {
  var self = this;

  if (type == 'condition') {
    return self.getConditionGroup();
  }

  var deviceId = self.config[type+'_sensor'];
  self.debug('querying for '+deviceId);
  if (typeof(deviceId) === 'undefined') {
    return;
  }
  var deviceObject = self.controller.devices.get(deviceId);
  if (deviceObject === null) {
    return;
  }
  return deviceObject.get('metrics:level');
};

