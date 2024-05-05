## BDA Projekt 2

### Author: Vojtěch Fiala

#### Informace about the implementation
A listing of all available Ganache accounts (for testing) is generated in the console right at the start. The private keys can be found out when you turn on Ganache - two of them are listed below.

The solution uses three config files in the config/ folder.
- ``erc_config.js`` - contains settings for the deployed ERC20 token. All values in there are multiplied by 10**18. Therefore, it is not advisable to enter too high values
- ``client_config.json`` - settings for lite-server
- ``client_app_config.json`` - path to the ABI of the deployed contract. The ABI also contains the address of the contract in it. Generated automatically when the contract is deployed.

#### Functionality limitations
- Token delegation is not supported
- It is not distinguished which proposals the user has already voted on and all that have been recorded are displayed. However, the user does not have the option to vote for their own proposals again. This is frontend-only issue. On the backend, there's a check
to ensure the user doesn't vote on nonexistent proposals and to ensure he doesn't repeatedly vote for the same proposals.

#### Technical limitations
- The application does not support changing the active wallet account - in such a case you need to restart the application (F5)
- Application does not work on Mozzila Firefox browser, tested and developed on Google Chrome
- For the application to work, the following must be true for ``erc_config.js`` - ``TOTALSUPPLY >= TMAX >= TRANSFERLIMIT``
- Updating the frontend only happens arbitrarily when a new block is added to the chain. The latest data can always be retrieved after a refresh (F5)
- In case of problems, see the console. 
- If something is not displayed correctly, it should be enough to refresh the page (F5)

#### Requirements:
- npm
- truffle
- lite-server
- Google Chrome


#### Steps for starting the application:
0. In case node modules are not yet installed, run ``npm install``
1. Starting a local blockchain - ``npx ganache-cli -h=localhost --port=8545 --mnemonic "firm caught raise meat kingdom sound theme movie business phrase family smooth"``
2. Deployment of smart contract - ``truffle migrate``
3. If the port/host of ganache was changed, the value of ganacheProviderUrl in ``jsfrontend.js`` must be changed
4. Start the local webserver (due to CORS etc.) e.g. via ``npx lite-server -c config/client_config.json`` 
5. Starting the client - open the address ``localhost:8000`` in the browser 
6. The application assumes that the user is using MetaMask and has the account set up in it that Ganache generated (it always generates the same due to mnemonic). User 0 is the only one who has a stock of tokens. The private keys to insert two accounts into MetaMask are below.

    - PK of account 0: ``0x3637861655ab8f37e9cf7badeb027b8c4c0de4e139903f57b59db954c4ad4dfc``
    - Account PK 1: ``0x3b3e519df82e8b17db26f324846f19e38dbe3097cc2015fdd16f0a88acab46b4``

7. If MetaMask does not have access enabled, you must enable it. When testing, just click the extension in the browser and click the menu.
