# Zway-WindowHeaterControl

Manages Window Heating Element based on various factors to avoid condensation
Creates a virtual device to show heating status

The Module features a configurable sleep and heating duration, this avoids the heating being on all the time.
Based on the preconditions set it will decide wether to heat the windows or not.
It uses hardcoded "condensing conditions", derived from the UndergroundWeather module, if one of these is encountered, it will always start heating
This is to avoid "sweating" of the windows if it is foggy or drizzling.

# Configuration

This module uses Humidity and Conditiongroups from the WeatherUnderground Module
(see here: https://github.com/maros/Zway-WeatherUnderground)
It will work with any sensor that emits relative humidity in percent.
The "condensing conditions" functionality will only work with WeatherUnderground API output

# Installation

```shell
cd /opt/z-way-server/automation/modules
git clone https://github.com/nikosch86/Zway-WindowHeaterControl.git WindowHeaterControl --branch release
```

To update or install a specific version
```shell
cd /opt/z-way-server/automation/modules/WindowHeaterControl
git fetch --tags
# For latest released version
git checkout release
git pull
# For a specific version
git checkout tags/1.02
# For development version
git checkout checkout master
```

# License

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or any 
later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.
