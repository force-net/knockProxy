# knockProxy
Simple TCP port forwarder with authorization

## Description
Main problem, which solves this module, is TCP proxy forwarder with additional authorization to prevent possible insecure access to some services.
Usual services, which can protect this module is RDP, VNC, SSH, or something similar. If you don't want to open ports of these services to internet (to protect it from password brute force or possible security issues), you can use this module.
Also, it can be useful to map RDP services in corporate network with NAT through one public server.
This solution usually is simplier than VPN, IPSec or SSH tunnelling and can be used for unskilled users. Also, you can modify http page and include detailed instructions.

## Logic of work
1. You configure login and password for user and it target host and port
2. User goes to http service and enters these login and password
3. If credentials are correct, special binding is created for current user IP to target host and port (for 2 minues, by default)
4. User starts additional connection to special host and port and this connection is proxied to target computer
5. When user disconnects, this binding is destroyed

E.g. we want to add ability to connect from anywhere by RDP to work computer with IP 192.168.1.42.
Also, we have public server/gateway with public ip 1.2.3.4, which can reach this work computer and internet
Remote client with IP 6.7.8.9 connects via browser to 1.2.3.4:8221, enters credentials and special mapping is created with next rule:
all tcp packets from client 6.7.8.9 to 1.2.3.4:8222 deliver to 192.168.1.42:3389.
So, remote client can connect to his work computer without additional complex methods like VPNs or IPSec

## Security
This module does not encrypt these connections, if you plan to use it for unsecure services (RDP is secure, VPN can be secure) without encryption - all traffic can be sniffed (like a direct connection).
To solve this problem, you should create secure tunnel and use VPN or client plugin for tunneling.
Authorization currently performed by http, but no plain password is transferred over internet (used salted hash).

## Requirements for server
Server should have nodejs and can be Windows or Linux computer. HTTP part should be located directly to internet (reverse proxy like nginx does not supported due requirement to know client ip).

## Requrements for client
Client only need browser for authorization and client program for connection. Client can be desktop computer or mobile, there are no restricions.
Client can be over NAT, but it should have one public IP during it internet session

## Installation

1. Download program files
2. Configure ports and binding interfaces
3. Ensure server_log folder is writable
4. Add required users to cliens.json config
4. Run npm install
5. Run node server.js (or pm2 start server.js, or use other node process manager)

