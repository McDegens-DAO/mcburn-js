# mcburn-js

A Node.js based CLI for interacting with the **mcburn** cNFT burner program for Solana.

This CLI serves as a personal wallet hygiene tool for forcefully burning a cNFT.

It is espeically helpful when the cNFT appears to be "unburnable" by other means.

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
```javascript
• add your private keypair 
• add your helius endpoint
• save mcburn.js and close
```
```javascript
// settings
let keypair = [0,0,0,"~"]; // this is your private keypair, be careful
const rpc = "https://rpc.helius.xyz/?api-key=xxxxxxxxxx"; // helius
const priority = 20; // lamports (priority fee)
const burner = "GwR3T5wAAWRCCNyjCs2g9aUM7qAtwNBsn2Z515oGTi7i"; // burner program
const throttle = 5000; // more if your rpc limits are low
```

# Terminal Usage

**torch**

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

**example output**
```javascript
npm run mcburn torch 8yriTfMg1BQDyaD7X2mUpeXSTe6W4Q91SwxupHnThWv1

> mcburn@0.0.2 mcburn
> node mcburn.js torch 8yriTfMg1BQDyaD7X2mUpeXSTe6W4Q91SwxupHnThWv1

private key in use!
assetId:  8yriTfMg1BQDyaD7X2mUpeXSTe6W4Q91SwxupHnThWv1
data_hash:  DWqMofJFqehTD2zg3hNfEA58WRYDW7xndJoSXG1ccW2g
creator_hash:  EKDHSGbrGztomDfuiV4iqiZ6LschDJPsFiXjZ83f92Md
leaf_id:  3840261
leafDelegate:  FBQHeifBur7UDEUkBV9v16TAYfhDTnpjbwV8GTdp5jMq
owner:  7Z3LJB2rxV4LiRBwgwTcufAWxnFTVJpcoCMiCo8Z5Ere
fetching proof...
tree_id:  BK1odnvdPePUsARpypamop1ug97d6yS4WTDXSRjNV8hF
root:  5ME3yJBttQeoCJ9u8LdGxtKrEuQYvg47R3SPAAJBKYet
fetching tree...
treeAuthorityPDA:  HZdoqGiwv7iihzDJvAnoYtMg65n3P4VQoD9HjV7m1DT6
canopyDepth:  0
totalSize:  138
proofs:  24
retrying:  false
creating alt...
ALT HELPER ADDRESS:  GxXLjXfreP3WceAue8HzJyaLr8TrDBESWtMCjRrqtopu
signature:  3K6cwE5kb78kKMa6xxXUJU1dibPGNDBE9iAXn6J5vwGGBW4kHhvQHVJTomFGkBVaRQAR8S3Mq4ZmN331MmHWqw9
finalizing alt creation...
alt created:  GxXLjXfreP3WceAue8HzJyaLr8TrDBESWtMCjRrqtopu
fetching alt...
alt found:  GxXLjXfreP3WceAue8HzJyaLr8TrDBESWtMCjRrqtopu
burning... 8yriTfMg1BQDyaD7X2mUpeXSTe6W4Q91SwxupHnThWv1
signature:  516vnbfRAmWRWDsY6iERS8wBkzcyjFY4MfVPWnhZrchhmEWoCfEpBMD38PPRDuRwmFA9bVyMWWLVLwv3F2Lj3LB3
finalizing burn...  8yriTfMg1BQDyaD7X2mUpeXSTe6W4Q91SwxupHnThWv1
asset burned:  8yriTfMg1BQDyaD7X2mUpeXSTe6W4Q91SwxupHnThWv1
deactivate helper: GxXLjXfreP3WceAue8HzJyaLr8TrDBESWtMCjRrqtopu
deactivating... GxXLjXfreP3WceAue8HzJyaLr8TrDBESWtMCjRrqtopu
signature:  dAELj4BeRbzhhpqBoJQrGV8JCqcAjLTzUjN6mPEs9EK2PVdhy5bFLdmWEgetH5NU6NgiHxenL7tnacTTpcX4j69
finalizing deactivation... GxXLjXfreP3WceAue8HzJyaLr8TrDBESWtMCjRrqtopu
helper deactivated:  GxXLjXfreP3WceAue8HzJyaLr8TrDBESWtMCjRrqtopu
waiting to close... GxXLjXfreP3WceAue8HzJyaLr8TrDBESWtMCjRrqtopu
attempting to close...  GxXLjXfreP3WceAue8HzJyaLr8TrDBESWtMCjRrqtopu
wait time: 340 blocks...
attempting to close...  GxXLjXfreP3WceAue8HzJyaLr8TrDBESWtMCjRrqtopu
wait time: 195 blocks...
attempting to close...  GxXLjXfreP3WceAue8HzJyaLr8TrDBESWtMCjRrqtopu
wait time: 57 blocks...
attempting to close...  GxXLjXfreP3WceAue8HzJyaLr8TrDBESWtMCjRrqtopu
signature:  39S67GB3jeoBUkpiFiRGYE7mi2Z1wVo1mu7s3k5x5532ubZ9XW2UfrRGNA1ygKVwVDQJuwR3xs8JgW3QU6dkWZTr
finalizing rent recovery...  GxXLjXfreP3WceAue8HzJyaLr8TrDBESWtMCjRrqtopu
...
alt closed:  GxXLjXfreP3WceAue8HzJyaLr8TrDBESWtMCjRrqtopu
funds recovered:  GxXLjXfreP3WceAue8HzJyaLr8TrDBESWtMCjRrqtopu
done
```





**retry**

In the case where an ALT is created but the burn transaction fails, you should use the **retry** command to continue where you left off while using the ALT address that was already created and paid for.
```javascript
  npm run mcburn retry <tokenId> false <altAddress>
```

**deactivate**

If you have an orphaned ALT that you need to deactivate you can do it directly with this command.
```javascript
  npm run mcburn deactivate <altAddress>
```

Passing **true** as an additional argument will attempt to deactivate the ALT without trying to close if afterwards.
```javascript
  npm run mcburn deactivate <altAddress> true
```

**close**

Once deactivated you can then close an ALT to recoup its rent. Before an ALT can be closed it must first have been deactivated. 
Closing an ALT cannot be done immediately after deactivation. If you run **mcburn close** immediately, it will display the remaining wait time 
in "blocks" in your terminal and retry once per min until it's permitted to be closed.
```javascript
  npm run mcburn close <altAddress>
```

# Notes

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

If there are > 22 proofs passed in the ix, there will first be a tx to create a *Helper ALT* prior to the burn transaction. The *Helper ALT* is used in this case to store the extra proofs that would blow the tx size limit.

**ALT Rent**

Since the ALT requires rent you have to save the *Helper ALT* address so that you can deactivate it and close it to recover funds. Please note that only the ALT creator can perform these actions and reclaim funds. When a *Helper ALT* is created the console logs will display this message followed by the *Helper ALT* address: 

ALT HELPER ADDRESS: <alt-address>
