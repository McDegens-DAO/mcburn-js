# mcburn-js

A Node.js based CLI for interacting with the **mcburn** cNFT burner program for Solana.

This CLI serves as a personal wallet hygiene tool for forcefully burning a cNFT.

It is espeically helpful when the cNFT appears to be "unburnable". 

# Solana Program

**Program Id:** GwR3T5wAAWRCCNyjCs2g9aUM7qAtwNBsn2Z515oGTi7i

You can find the open source **mcburn** Rust repo here: [mcburn](https://github.com/honeygrahams2/mcburn)

Our program is deployed on Solana mainnet and all are welcome to use it.

# Installing mcburn-js

1. Start a new Node.js project.

2. Navigate to your project root and run this command in your terminal to clone the repo:

```javascript
git clone https://github.com/McDegens-DAO/mcburn-js.git
```
3. Move the downloaded files to your project root.

4. Run this command in your terminal to install required modules:

```javascript
npm install
```
5. Open **mcburn.js** in your editor.
• add your private keypair 
• add your helius endpoint
• save mcburn.js and close

# Terminal Usage

**npm run mcburn torch**

This will run a complete burn. Please be advised that if there are more than 
22 proofs being passed for the cNFT, the creation of a ALT (lookup table) 
is required first which requires rent that you will be reclaimed.
The **torch** argument will attempt to create the ALT automatically when necessary 
and continue the burning process. In these cases it can take some time for the burn 
process to complete because it will attempt to deactivate and close the ALT after burning 
to recoup the rent for you. 
```javascript
  npm run mcburn torch <tokenId>
```

**npm run mcburn retry**

In the case where an ALT is created but the burn transaction fails, you should use the **retry** command to continue where you left off while using the ALT address that was already created and paid for.
```javascript
  npm run mcburn retry <tokenId> <altAddress>
```

**npm run mcburn deactivate**

If you have an orphaned ALT that you need to deactivate you can do it directly with this command.
```javascript
  npm run mcburn deactivate <altAddress>
```

Passing **true** as an additional argument will attempt to deactivate the ALT without trying to close if afterwards.
```javascript
  npm run mcburn deactivate <altAddress> true
```

**npm run mcburn close**

Once deactivated you can then close an ALT to recoup its rent. Before an ALT can be closed it must first have been deactivated. 
Closing an ALT cannot be done immediately after deactivation. If you run **mcburn close** immediately, it will display the remaining wait time 
in "blocks" in your terminal and retry once per min until it's permitted to be closed.
```javascript
  npm run mcburn close <altAddress>
```






# Static ALT
(lookup table)

**Address:** 6NVtn6zJDzSpgPxPRtd6UAoWkDxmuqv2HgCLLJEeQLY

The mcburn Solana program uses a predefined ALT we call a the *Static ALT* where common program ids are stored to reduce the overall tx size of the burn. 
There are 5 *Lookup Table Entries* in the *Static ALT* that are used by default in every tx:

1. Burner Program Id
2. System Program Id
3. State Compression Program Id
4. Noop Program Id
5. Bubblegum Program Id

# Helper ALT
(lookup table)

In some cases multiple transactions are required to burn a stubborn cNFT.

**Example**

If there are > 23 proofs passed in the ix, there will first be a tx to create a *Helper ALT* prior to the burn transaction. The *Helper ALT* is used in this case to store the extra proofs that would blow the tx size limit.

**ALT Rent**

Since the ALT requires rent you have to save the *Helper ALT* address so that you can deactivate it and close it to recover funds. Please note that only the ALT creator can perform these actions and reclaim funds. When a *Helper ALT* is created the console logs will display this message followed by the *Helper ALT* address: 

"SAVE THIS ALT ADDRESS TO DEACTIVATE AND CLOSE LATER TO RECOUP FUNDS!"

**Deactivating & Closing**

There are some timing events that have to be considered. You can not deactivate a *Helper ALT* imediately after burning and you can not close a *Helper ALT* imediately after deactivating it. The timing required may be by slots passed or blockhash expiration, we don't know yet. Currently we're just waiting 5 minutes after the burn to deactivate, and then another 5 min before closing. We will run more tests to narrow this timing down and dumify the flow.

# Apps

Wallet providers and burner apps may want to consider handling the *Helper ALT* creation and reclaiming of rent on their backend to simplify the front end flow for their users.
