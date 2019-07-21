# System requirements

__Note__: The configurations described below are what we use and test against.
This means that other configurations might also work but we do not
provide any official support for them.

## Server

### Hardware

* __Memory:__ 4096 MB
* __Free disc space:__ 2 GB

### Operating system

| Distribution (64 bits only)     | Identifier   | init system |
| :------------------------------ | :----------- | :---------- |
| CentOS/RHEL 7.x                 | centos-7     | systemd     |
| Debian 9 Stretch                | debian-9     | systemd     |
| Suse Linux Enterprise Server 12 | sles-12      | sysvinit    |
| Ubuntu 16.04 Xenial Xerus       | ubuntu-16.04 | upstart     |
| Ubuntu 18.04 Bionic Beaver      | ubuntu-18.04 | systemd     |


### Dependencies

* __Runtime:__ [Ruby](https://www.ruby-lang.org/en/) Version = 2.6.x
* __Webserver:__ [Apache](http://httpd.apache.org/)
  or [nginx](http://nginx.org/en/docs/)
* __Application server:__ [Phusion Passenger](https://www.phusionpassenger.com/)
  or [Unicorn](http://unicorn.bogomips.org/)
* __Database__: [PostgreSQL](http://www.postgresql.org/) Version >= 9.5

Please be aware that the dependencies listed above also have a lot of
dependencies themselves.

## Client

OpenProject supports the latest versions of the major browsers. In our
strive to make OpenProject easy and fun to use we had to drop support
for some older browsers (e.g. IE 11).

* [Mozilla Firefox](https://www.mozilla.org/en-US/firefox/products/) (At least ESR version 60)
* [Microsoft Edge](https://www.microsoft.com/de-de/windows/microsoft-edge)
* [Google Chrome](https://www.google.com/chrome/browser/desktop/)
