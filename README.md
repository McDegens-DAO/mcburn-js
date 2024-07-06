# mcburn-js 2.0.0

A Node.js based CLI for interacting with the **mcburn** cNFT burner program for Solana.

This CLI serves as a personal wallet hygiene tool for forcefully burning a cNFT.

**mcburn** allows you to burn a cNFT without connecting your wallet to an external application.

It is especically helpful when a cNFT appears to be "unburnable" by other means.

# install/update mcburn-js

1. Navigate to your mcburn project folder and run this command in your terminal to install or update

```javascript
git clone https://github.com/McDegens-DAO/mcburn-js.git && mv mcburn-js/* . && npm install && npm run updater
```
2. If it's a new install, open **config.js** in your editor to add your settings.
```javascript
• add your private keypair 
• add your helius endpoint
• save config.js and close
```
# using mcburn

**burn a cnft**
```javascript
npm run mcburn torch <tokenId>
```
**burn a cnft but do not deactivate the helper alt** (if one exist)
```javascript
npm run mcburn torch <tokenId> true
```
**retry burn using an existing alt address**
```javascript
npm run mcburn retry <tokenId> false <altAddress>
```
**retry burn using an existing alt address but do not deactivate helper alt**
```javascript
npm run mcburn retry <tokenId> true <altAddress>
```
**deactivate a helper alt and try to close it**
```javascript
npm run mcburn deactivate <altAddress>
```
**deactivate a helper alt and do not try to close it**
```javascript
npm run mcburn deactivate <altAddress> true
```
**close a helper alt and recover funds**
```javascript
npm run mcburn close <altAddress>
```

# details

**mcburn torch**

The torch command will run a complete burn. Please be advised that if there are more than 
20 proofs being passed for the cNFT, the creation of an ALT (lookup table) 
is necessary prior to burning which requires rent, that you will reclaim.
The **torch** command will attempt to create the ALT automatically when necessary 
and continue the burning process. In these cases it can take some time for the burn 
process to complete because it will attempt to deactivate and close the ALT after burning 
to recoup the rent for you. 
```javascript
  npm run mcburn torch <tokenId>
```

**torch and stop**

Passing an additional "true" argument after the token id will stop the script after the burn. 
If the burn required an ALT, the ALT would then be orphaned. You would then have to deactivate and close the ALT so save the ALT address.
```javascript
  npm run mcburn torch <tokenId> true
```

**mcburn retry**

In the case where an ALT is created but the burn transaction fails, you should use the **retry** command to continue where you left off while using the ALT address that was already created and paid for.
```javascript
  npm run mcburn retry <tokenId> false <altAddress>
```
```javascript
  npm run mcburn retry <tokenId> true <altAddress>
```

**mcburn deactivate**

If you have an orphaned ALT that you need to deactivate you can do it directly with this command.
```javascript
  npm run mcburn deactivate <altAddress>
```

**deactivate and stop**

Passing **true** as an additional argument will attempt to deactivate the ALT without trying to close if afterwards.
```javascript
  npm run mcburn deactivate <altAddress> true
```

**mcburn close**

Once deactivated you can then close an ALT to recoup its rent. Before an ALT can be closed it must first have been deactivated. 
Closing an ALT cannot be done immediately after deactivation. If you run **mcburn close** immediately, it will display the remaining wait time 
in "blocks" in your terminal and retry once per min until it's permitted to be closed.
```javascript
  npm run mcburn close <altAddress>
```

# notes

**Static ALT**

(lookup table)

Address: 6NVtn6zJDzSpgPxPRtd6UAoWkDxmuqv2HgCLLJEeQLY

The mcburn Solana program uses a predefined ALT we call a the *Static ALT* where common program ids are stored to reduce the overall tx size of the burn. 
There are 5 *Lookup Table Entries* in the *Static ALT* that are used by default in every tx:

1. Burner Program Id
2. System Program Id
3. State Compression Program Id
4. Noop Program Id
5. Bubblegum Program Id

**Helper ALT**

(lookup table)

In some cases multiple transactions are required to burn a stubborn cNFT.

**Example**

If > 20 proofs are passed in the ix, there will first be a tx to create a *Helper ALT* prior to the burn transaction. The *Helper ALT* is used in this case to store the extra proofs that would blow the tx size limit.

**ALT Rent**

Since the ALT requires rent you have to save the *Helper ALT* address so that you can deactivate it and close it to recover funds. Please note that only the ALT creator can perform these actions and reclaim funds.

# solana program

**Program Id:** GwR3T5wAAWRCCNyjCs2g9aUM7qAtwNBsn2Z515oGTi7i

You can find the open source **mcburn** Rust repo here: [mcburn-rs](https://github.com/honeygrahams2/mcburn-rs)

Our program is deployed on Solana mainnet and all are welcome to use it.

# bulk burning

For bulk burning through an application we recommend [Sol Incinerator](https://sol-incinerator.com/)
