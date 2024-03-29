# ioBroker.xplora

![Logo](admin/xplora.png)

[![NPM version](https://img.shields.io/npm/v/iobroker.xplora.svg)](https://www.npmjs.com/package/iobroker.xplora)
[![Downloads](https://img.shields.io/npm/dm/iobroker.xplora.svg)](https://www.npmjs.com/package/iobroker.xplora)
![Number of Installations (latest)](https://iobroker.live/badges/xplora-installed.svg)
![Number of Installations (stable)](https://iobroker.live/badges/xplora-stable.svg)
![Known Vulnerabilities](https://snyk.io/test/github/MiGoller/ioBroker.xplora/badge.svg)

[![NPM](https://nodei.co/npm/iobroker.xplora.png?downloads=true)](https://nodei.co/npm/iobroker.xplora/)

**Tests:** ![Test and Release](https://github.com/MiGoller/ioBroker.xplora/workflows/Test%20and%20Release/badge.svg)

## xplora adapter for ioBroker

Inofficial ioBroker adapter for Xplora® smartwatches.

## Documentation?

The adapter is under construction and the documentation as well. Please be patient.

## Changelog
<!--
  Placeholder for the next version (at the beginning of the line):
  ### **WORK IN PROGRESS**
-->
### 0.1.2 (2023-05-01)

- Fix for issue #13 [Kein Login möglich](https://github.com/MiGoller/ioBroker.xplora/issues/13)

### 0.1.1-beta.1 (2022-07-01)

- Update package version in `io-package.json`

### 0.1.1-beta.0 (2022-07-01)

- Updated default value for datapoint `info.lastUpdate` to fix issue [#9 Object xplora.0.info.lastUpdate is invalid](https://github.com/MiGoller/ioBroker.xplora/issues/9)

- Catch uncaught exceptions for invalid or missing XPLORA data returned from API to fix issue [#7 Don't let adapter terminate itself for 50x API-errors](https://github.com/MiGoller/ioBroker.xplora/issues/7)

### 0.1.0 (2021-11-14)

- (MiGoller) MVP release

### 0.0.1

- (MiGoller) initial release

## License

MIT License

Copyright (c) 2021-2023 MiGoller <migoller@mail.de>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
