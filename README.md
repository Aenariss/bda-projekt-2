# bda-projekt-2

1. Spusteni lokalni blockchainu (npx ganache-cli -h=localhost --port=8545 --mnemonic "firm caught raise meat kingdom sound theme movie business phrase family smooth")
2. Deployment smart kontraktu (truffle migrate)
3. Spusteni klienta pres ``npx lite-server -c config/client_config.json `` 
4. V prohlizeci na adrese localhost:8000

5. Pocitam, ze se bude pouzivat MetaMask, konkretne kontroluju window.ethereum. Do MetaMasku lze naimportovat privatni klice uctu co vygenerovalo Ganache --

PK uctu 0: 0x3637861655ab8f37e9cf7badeb027b8c4c0de4e139903f57b59db954c4ad4dfc
PK uctu 1: 0x3b3e519df82e8b17db26f324846f19e38dbe3097cc2015fdd16f0a88acab46b4

Ucet 0 ma jako jediny k dispozici tokeny - nutne je preposlat jinam.

6. Je nutne v metamasku povolit strance pristup. Pak F5
7. Pri kazdem deploynuti smart kontraktu je nutne zjistit adresu, kde je deploynuty ImprovedERC. Tuhle adresu pak je nutne vlozit do config/client_app_config,json


NEpodporuju zmenu uctu v prubehu. Je potreba F5 po zmene
V pripade problemu viz konzole
NEpodporuju delegaci tokenu

--- NEFUNGUJE NA MOZZILE, TESTOVANI V CHROMU ---

erc_config.js urcuje konfiguraci. Aby aplikace fungovala, musi platit TOTALSUPPLY >= TMAX >= TRANSFERLIMIT

Automaticke aktualizace frontendu probihaji pouze kdyz se prida novy blok (jinak -- F5!)

Uzivatel nema odlisene, na ktere proposaly uz klikal a na ktere ne (ma skryte jen svoje)
Vypisuju vzdycky vsechny v historii zaznamenane proposaly