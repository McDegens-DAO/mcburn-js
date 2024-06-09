////////////////////////////////////////////////////////////////////////////////
// name: mcburn.js
// version: 2.0 (dev)
// we will remove the dev tag once the cu/priority fee updates have been tested
////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////
// imports
import axios from "axios";
import * as BN_ from "bn.js";
let BN = BN_.BN;
import * as solanaWeb3 from "@solana/web3.js";
import * as splAccountCompression from "@solana/spl-account-compression";
import * as bs58_ from "bs58";
let bs58 = bs58_.default;
import * as buffer from "buffer";
let Buffer = buffer.Buffer;
let provider = null;
let connection = null;
const static_alt = "6NVtn6zJDzSpgPxPRtd6UAoWkDxmuqv2HgCLLJEeQLY";
const BUBBLEGUM = "BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY";
////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////
// settings
const keypair = [0,0,0,"~"]; // this is your private keypair, be careful
// const keypair = null; // used for hot wallet connections
const rpc = "https://rpc.helius.xyz/?api-key=xxxxxxxxxx"; // helius
const priority = "Medium"; // lamports (priority fee)
const burner = "GwR3T5wAAWRCCNyjCs2g9aUM7qAtwNBsn2Z515oGTi7i"; // burner program
const throttle = 5000; // more seconds if your rpc limits are being stressed
const burn_cu = 150000; // cu limit for the main burn method
const other_cu = 100000; // cu limit for deactivating and closing alts
////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////
// dev - define wallet provider here
if(keypair!=null){
  provider=solanaWeb3.Keypair.fromSecretKey(new Uint8Array(keypair));
  console.log("private key in use!");
}
else{
  // browser wallet connection here
  console.log("expecting browser wallet!");
  provider="error!";
}
////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////
// gets a fee estimate for a tx
async function getPriorityFeeEstimate(cluster, priorityLevel, transaction) {
  let response = await fetch(cluster, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "1",
      method: "getPriorityFeeEstimate",
      params: [
        {
          transaction: bs58.encode(transaction.serialize()), // Pass the serialized transaction in Base58
          options: { priorityLevel: priorityLevel },
        },
      ],
    }),
  });
  let data = await response.json();
  data = parseInt(data.result.priorityFeeEstimate);
  return data;
}
////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////
// verifies finalized status of signature
async function finalized(sig,max=10,int=4){
  return await new Promise(resolve => {
    let start = 1;
    let connection = new solanaWeb3.Connection(rpc, "confirmed");
    let intervalID = setInterval(async()=>{
      let tx_status = null;
      tx_status = await connection.getSignatureStatuses([sig], {searchTransactionHistory: true,});
      console.log(start+": "+sig);
      if (tx_status != null && typeof tx_status.value != "undefined"){ 
        console.log(tx_status.value);
      }
      else{
        console.log("failed to get status...");
      }
      if (tx_status == null || 
      typeof tx_status.value == "undefined" || 
      tx_status.value == null || 
      tx_status.value[0] == null || 
      typeof tx_status.value[0] == "undefined" || 
      typeof tx_status.value[0].confirmationStatus == "undefined"){} 
      else if(tx_status.value[0].confirmationStatus == "processed"){
        start = 1;
      }
      else if (tx_status.value[0].confirmationStatus == "finalized"){
        if(tx_status.value[0].err != null){
          resolve('program error!');
          clearInterval(intervalID);
        }
        resolve('finalized');
        clearInterval(intervalID);
      }
      start++;
      if(start == max + 1){
        resolve((max * int)+' seconds max wait reached');
        clearInterval(intervalID);
      }
    },(int * 1000));
  });  
}
////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////
// burn cnft
async function mcburn(_asset_,_priority_,_helius_,_program_,_alt_,_deactivate_=false,_retry_=false) { 
    
  let connection = new solanaWeb3.Connection(_helius_, "confirmed");
  let assetId = _asset_;
  console.log("assetId: ", assetId);

  let heliusUrl = _helius_;
  let axiosInstance = axios.create({baseURL: heliusUrl});
  let cNFTBurnerProgramId = new solanaWeb3.PublicKey(_program_);

  const getAsset = await axiosInstance.post(heliusUrl, {
    jsonrpc: "2.0",
    method: "getAsset",
    id: "rpd-op-123",
    params: {id: assetId},
  });
  console.log("data_hash: ", getAsset.data.result.compression.data_hash);
  console.log("creator_hash: ", getAsset.data.result.compression.creator_hash);
  console.log("leaf_id: ", getAsset.data.result.compression.leaf_id);

  let leafDelegate = provider.publicKey;
  if (getAsset.data.result.ownership.delegated == true) {
    leafDelegate = new solanaWeb3.PublicKey(getAsset.data.result.ownership.delegate);
  }
  console.log("leafDelegate: ", leafDelegate.toString());  
  console.log("owner: ", getAsset.data.result.ownership.owner);
  if (getAsset.data.result.ownership.owner != provider.publicKey) {
    console.log("Asset Not Owned by Provider");
    return;
  }
  if (getAsset.data.result.burnt == true) {
    console.log("Asset Already Burned");
    return;
  }  

  console.log("fetching proof...");
  await new Promise(_=>setTimeout(_,throttle));

  const getAssetProof = await axiosInstance.post(heliusUrl, {
    jsonrpc: "2.0",
    method: "getAssetProof",
    id: "rpd-op-123",
    params: {id: assetId},
  });
  console.log("tree_id: ", getAssetProof.data.result.tree_id);
  console.log("root: ", getAssetProof.data.result.root);

  console.log("fetching tree...");
  await new Promise(_=>setTimeout(_,throttle));
  
  const treeAccount = await splAccountCompression.ConcurrentMerkleTreeAccount.fromAccountAddress(
  connection, new solanaWeb3.PublicKey(getAssetProof.data.result.tree_id),);  
  const treeAuthorityPDA = treeAccount.getAuthority();
  const canopyDepth = treeAccount.getCanopyDepth();
  console.log("treeAuthorityPDA: ", treeAuthorityPDA.toString());
  console.log("canopyDepth: ", canopyDepth);
  
  const proof = getAssetProof.data.result.proof
  .slice(0, getAssetProof.data.result.proof.length - (!!canopyDepth ? canopyDepth : 0))
  .map((node) => ({
    pubkey: new solanaWeb3.PublicKey(node),
    isWritable: false,
    isSigner: false,
  }));
  
  var totalSize = 1 + 32 + 32 + 32 + 32 + 8 + 1;
  console.log("totalSize: ", totalSize);
  
  var uarray = new Uint8Array(totalSize);
  let counter = 0;    
  uarray[counter++] = 0; // 0 = cnft_burner BurnCNFT instruction
  
  let assetIdb58 = bs58.decode(assetId);
  var arr = Array.prototype.slice.call(Buffer.from(assetIdb58), 0);
  for (let i = 0; i < arr.length; i++) {
    uarray[counter++] = arr[i];
  }

  let rootb58 = bs58.decode(getAssetProof.data.result.root);
  var arr = Array.prototype.slice.call(Buffer.from(rootb58), 0);
  for (let i = 0; i < arr.length; i++) {
    uarray[counter++] = arr[i];
  }

  let datahashb58 = bs58.decode(getAsset.data.result.compression.data_hash);
  var arr = Array.prototype.slice.call(Buffer.from(datahashb58), 0);
  for (let i = 0; i < arr.length; i++) {
    uarray[counter++] = arr[i];
  }

  let creatorhashb58 = bs58.decode(getAsset.data.result.compression.creator_hash);
  var arr = Array.prototype.slice.call(Buffer.from(creatorhashb58), 0);
  for (let i = 0; i < arr.length; i++) {
    uarray[counter++] = arr[i];
  }
  
  var byteArray = [0, 0, 0, 0, 0, 0, 0, 0];
  for ( var index = 0; index < byteArray.length; index ++ ) {
    var byte = getAsset.data.result.compression.leaf_id & 0xff;
    byteArray [ index ] = byte;
    getAsset.data.result.compression.leaf_id = (getAsset.data.result.compression.leaf_id - byte) / 256 ;
  }
  for (let i = 0; i < byteArray.length; i++) {
    uarray[counter++] = byteArray[i];
  }
  
  uarray[counter++] = proof.length;
  
  let keys = [
    { pubkey: provider.publicKey, isSigner: true, isWritable: true }, // 0
    { pubkey: leafDelegate, isSigner: false, isWritable: true }, // 1
    { pubkey: new solanaWeb3.PublicKey(getAssetProof.data.result.tree_id), isSigner: false, isWritable: true }, // 2
    { pubkey: treeAuthorityPDA, isSigner: false, isWritable: true }, // 3
    { pubkey: splAccountCompression.PROGRAM_ID, isSigner: false, isWritable: false }, // 4
    { pubkey: splAccountCompression.SPL_NOOP_PROGRAM_ID, isSigner: false, isWritable: false }, // 5
    { pubkey: solanaWeb3.SystemProgram.programId, isSigner: false, isWritable: false }, // 6
    { pubkey: new solanaWeb3.PublicKey(BUBBLEGUM), isSigner: false, isWritable: false }, // 7
  ];
  for (let i = 0; i < proof.length; i++) {keys.push(proof[i]);}
  
  const burnCNFTIx = new solanaWeb3.TransactionInstruction({
    programId: cNFTBurnerProgramId,
    data: Buffer.from(uarray),
    keys: keys,
  });
  
  let mainALTAddress = new solanaWeb3.PublicKey(_alt_);  
  const mainALTAccount = await connection
  .getAddressLookupTable(mainALTAddress)
  .then((res) => res.value);
  if (!mainALTAccount) {
    console.log("Could not fetch ALT!");
    return;
  }  

  let messageV0 = null;
  console.log("proofs: ", proof.length);
  console.log("retrying: ", _retry_);
  
  if(_retry_!=false){

    let proofALTAddress = new solanaWeb3.PublicKey(_retry_);  
    const proofALTAccount = await connection.getAddressLookupTable(proofALTAddress).then((res) => res.value);    
    if (!proofALTAccount) {
      console.log("Could not fetch proof ALT!");
      console.log("done");
      return;
    }
    console.log("alt found");
    
    console.log("burning... "+assetId);
    await new Promise(_=>setTimeout(_,throttle));
    /// ***
    let computeLimitIx = solanaWeb3.ComputeBudgetProgram.setComputeUnitLimit({units:burn_cu,});
    let instructions = [computeLimitIx, burnCNFTIx];
    messageV0 = new solanaWeb3.TransactionMessage({
      payerKey: provider.publicKey,
      recentBlockhash: (await connection.getRecentBlockhash('confirmed')).blockhash,
      instructions: instructions,
    }).compileToV0Message([proofALTAccount]);
    let tx = new solanaWeb3.VersionedTransaction(messageV0);
    let feeEstimate = await getPriorityFeeEstimate(_helius_, _priority_, tx);      
    console.log("fee estimate: ", feeEstimate);
    let computePriceIx = solanaWeb3.ComputeBudgetProgram.setComputeUnitPrice({microLamports: feeEstimate,});
    let final_instructions = instructions.slice();
    final_instructions.unshift(computePriceIx);
    messageV0 = new solanaWeb3.TransactionMessage({
      payerKey: provider.publicKey,
      recentBlockhash: (await connection.getRecentBlockhash('confirmed')).blockhash,
      instructions: final_instructions,
    }).compileToV0Message([proofALTAccount]);
    tx = new solanaWeb3.VersionedTransaction(messageV0);      
    /// ***
    
    try {
      let signature = null;
      let signedTx = null;
      if(keypair!=null){
        tx.sign([provider]);
        let signature = await connection.sendRawTransaction(tx.serialize(),{
          skipPreflight: true,
          maxRetries: 0 
        });          
      }
      else{
        signedTx = await provider.signTransaction(tx);
        let signature = await connection.sendRawTransaction(signedTx.serialize(),{
          skipPreflight: true,
          maxRetries: 0 
        });           
      }
      console.log("signature: ", signature);
      console.log("finalizing burn... ", assetId);
      await new Promise(_=>setTimeout(_,throttle));
      let i = 0;
      let final = await finalized(signature,10,4);
      if(final != "finalized"){
        console.log("replay error!");
        console.log("running the following command to try again");
        if(_deactivate_==false){
          console.log("npm run mcburn retry "+assetId+" false "+proofALTAddress.toBase58());
        }
        else{
          console.log("npm run mcburn retry "+assetId+" true "+proofALTAddress.toBase58());
        }
        return;
      }
      console.log("asset burned: ",assetId);
      if(_deactivate_==false){
        await new Promise(_=>setTimeout(_,throttle));
        await altDeactivate(_priority_,proofALTAddress.toBase58(),_helius_);
        return "deactivated";
      }
      else{
        return;
      }
    }
    catch(error) {
      console.log("replay error!");
      console.log("running the following command to try again");
      if(_deactivate_==false){
        console.log("npm run mcburn retry "+assetId+" false "+proofALTAddress.toBase58());
      }
      else{
        console.log("npm run mcburn retry "+assetId+" true "+proofALTAddress.toBase58());
      }
      error = JSON.stringify(error);
      error = JSON.parse(error);
    }    

  }
  else if (proof.length <= 22) {
    
    console.log("burning... ", _asset_);
    await new Promise(_=>setTimeout(_,throttle));
    /// ***
    let computeLimitIx = solanaWeb3.ComputeBudgetProgram.setComputeUnitLimit({units:burn_cu,});
    let instructions = [computeLimitIx, burnCNFTIx];
    messageV0 = new solanaWeb3.TransactionMessage({
      payerKey: provider.publicKey,
      recentBlockhash: (await connection.getRecentBlockhash('confirmed')).blockhash,
      instructions: instructions,
    }).compileToV0Message([mainALTAccount]);
    let tx = new solanaWeb3.VersionedTransaction(messageV0);
    let feeEstimate = await getPriorityFeeEstimate(_helius_, _priority_, tx);      
    console.log("fee estimate: ", feeEstimate);
    let computePriceIx = solanaWeb3.ComputeBudgetProgram.setComputeUnitPrice({microLamports: feeEstimate,});
    let final_instructions = instructions.slice();
    final_instructions.unshift(computePriceIx);
    messageV0 = new solanaWeb3.TransactionMessage({
      payerKey: provider.publicKey,
      recentBlockhash: (await connection.getRecentBlockhash('confirmed')).blockhash,
      instructions: final_instructions,
    }).compileToV0Message([mainALTAccount]);
    tx = new solanaWeb3.VersionedTransaction(messageV0); 
    /// ***
    
    try {
      let signature = null;
      let signedTx = null;
      if(keypair!=null){
        tx.sign([provider]);
        let signature = await connection.sendRawTransaction(tx.serialize(),{
          skipPreflight: true,
          maxRetries: 0 
        });  
      }
      else{
        signedTx = await provider.signTransaction(tx);
        let signature = await connection.sendRawTransaction(signedTx.serialize(),{
          skipPreflight: true,
          maxRetries: 0 
        }); 
      }      
      console.log("signature: ", signature);
      console.log("finalizing burn... ", _asset_);
      await new Promise(_=>setTimeout(_,throttle));
      let i = 0;
      let final = await finalized(signature,10,4);
      if(final != "finalized"){
        console.log("error: ", final);
        console.log("done:");
        return;
      }
      console.log("asset burned: ", _asset_);
      console.log("signature:", signature);
      console.log("done:");
      return "ok";
    }
    catch(error) {
      console.log("error: ", error);
      console.log("done:");
      return;
    }

  }
  else {

    console.log("creating alt...");
    await new Promise(_=>setTimeout(_,throttle));
    const slot = await connection.getSlot();
    const [createALTIx, proofALTAddress] = solanaWeb3.AddressLookupTableProgram.createLookupTable({
      authority: provider.publicKey,
      payer: provider.publicKey,
      recentSlot: slot,
    });
    console.log("ALT HELPER ADDRESS: ", proofALTAddress.toBase58());

    let proofPubkeys = [];
    for (let i = 0; i < proof.length - 22; i++) {proofPubkeys.push(proof[i].pubkey);}

    let extendALTIx = solanaWeb3.AddressLookupTableProgram.extendLookupTable({
      payer: provider.publicKey,
      authority: provider.publicKey,
      lookupTable: proofALTAddress,
      addresses: [
        cNFTBurnerProgramId,
        splAccountCompression.PROGRAM_ID,
        splAccountCompression.SPL_NOOP_PROGRAM_ID,
        solanaWeb3.SystemProgram.programId,
        new solanaWeb3.PublicKey(BUBBLEGUM),
        ...proofPubkeys,                
      ],
    });

    await new Promise(_=>setTimeout(_,throttle));
    /// ***
    let computeLimitIx = solanaWeb3.ComputeBudgetProgram.setComputeUnitLimit({units:other_cu,});
    let instructions = [computeLimitIx, createALTIx, extendALTIx];
    messageV0 = new solanaWeb3.TransactionMessage({
      payerKey: provider.publicKey,
      recentBlockhash: (await connection.getRecentBlockhash('confirmed')).blockhash,
      instructions: instructions,
    }).compileToV0Message([mainALTAccount]);
    let tx = new solanaWeb3.VersionedTransaction(messageV0);
    let feeEstimate = await getPriorityFeeEstimate(_helius_, _priority_, tx);      
    console.log("fee estimate: ", feeEstimate);
    let computePriceIx = solanaWeb3.ComputeBudgetProgram.setComputeUnitPrice({microLamports: feeEstimate,});
    let final_instructions = instructions.slice();
    final_instructions.unshift(computePriceIx);
    messageV0 = new solanaWeb3.TransactionMessage({
      payerKey: provider.publicKey,
      recentBlockhash: (await connection.getRecentBlockhash('confirmed')).blockhash,
      instructions: final_instructions,
    }).compileToV0Message([mainALTAccount]);
    tx = new solanaWeb3.VersionedTransaction(messageV0);      
    /// ***
    
    try {

      let signature = null;
      let signedTx = null;
      if(keypair!=null){
        createALTTx.sign([provider]);
        let signature = await connection.sendRawTransaction(createALTTx.serialize(),{
          skipPreflight: true,
          maxRetries: 0 
        }); 
      }
      else{
        signedTx = await provider.signTransaction(createALTTx);
        let signature = await connection.sendRawTransaction(signedTx.serialize(),{
          skipPreflight: true,
          maxRetries: 0 
        });
      }
      console.log("signature: ", signature);
      console.log("finalizing alt creation...");
      await new Promise(_=>setTimeout(_,throttle));          
      let i = 0;

      let final = await finalized(signature,10,4);
      if(final != "finalized"){
        console.log("error: ", final);
        return;
      }

      console.log("alt created: ", proofALTAddress.toBase58());        
      console.log("fetching alt...");
      await new Promise(_=>setTimeout(_,throttle));

      let proofALTAccount = await connection.getAddressLookupTable(proofALTAddress).then((res) => res.value);    
      if (!proofALTAccount) {
        console.log("Could not fetch proof ALT!");
        return;
      }
      console.log("alt found: ", proofALTAddress.toBase58());
      
      console.log("burning... "+assetId);
      await new Promise(_=>setTimeout(_,throttle));
      /// ***
      let computeLimitIx = solanaWeb3.ComputeBudgetProgram.setComputeUnitLimit({units:burn_cu,});
      let instructions = [computeLimitIx, burnCNFTIx];
      messageV0 = new solanaWeb3.TransactionMessage({
        payerKey: provider.publicKey,
        recentBlockhash: (await connection.getRecentBlockhash('confirmed')).blockhash,
        instructions: instructions,
      }).compileToV0Message([proofALTAccount]);
      let tx = new solanaWeb3.VersionedTransaction(messageV0);
      let feeEstimate = await getPriorityFeeEstimate(_helius_, _priority_, tx);      
      console.log("fee estimate: ", feeEstimate);
      let computePriceIx = solanaWeb3.ComputeBudgetProgram.setComputeUnitPrice({microLamports: feeEstimate,});
      let final_instructions = instructions.slice();
      final_instructions.unshift(computePriceIx);
      messageV0 = new solanaWeb3.TransactionMessage({
        payerKey: provider.publicKey,
        recentBlockhash: (await connection.getRecentBlockhash('confirmed')).blockhash,
        instructions: final_instructions,
      }).compileToV0Message([proofALTAccount]);
      tx = new solanaWeb3.VersionedTransaction(messageV0);      
      /// ***            
      try {
        let signature = null;
        let signedTx = null;
        if(keypair!=null){
          tx.sign([provider]);
          let signature = await connection.sendRawTransaction(tx.serialize(),{
            skipPreflight: true,
            maxRetries: 0 
          }); 
        }
        else{
          signedTx = await provider.signTransaction(tx);
          let signature = await connection.sendRawTransaction(signedTx.serialize(),{
            skipPreflight: true,
            maxRetries: 0 
          }); 
        }
        console.log("signature: ", signature);
        console.log("finalizing burn... ", assetId);
        await new Promise(_=>setTimeout(_,throttle));
        let i = 0;
        let final = await finalized(signature,10,4);
        if(final != "finalized"){
          console.log("error: ", final);
          console.log("replay error!");
          console.log("run the following command to try again");
          if(_deactivate_==false){
            console.log("npm run mcburn retry "+assetId+" false "+proofALTAddress.toBase58());
          }
          else{
            console.log("npm run mcburn retry "+assetId+" true "+proofALTAddress.toBase58());
          }              
          console.log("done");
          return;
        }
        console.log("asset burned: ",assetId);
        if(_deactivate_ == false){
          await new Promise(_=>setTimeout(_,throttle));
          await altDeactivate(_priority_,proofALTAddress.toBase58(),_helius_);
          return "deactivated";
        }
        else{
          return;
        }
      }
      catch(error) {
        console.log("replay error!");
        console.log("run the following command to try again");
        if(_deactivate_==false){
          console.log("npm run mcburn retry "+assetId+" false "+proofALTAddress.toBase58());
        }
        else{
          console.log("npm run mcburn retry "+assetId+" true "+proofALTAddress.toBase58());
        }              
        console.log("done");
        error = JSON.stringify(error);
        error = JSON.parse(error);
        return;
      }
      
    } 
    catch(error) {
        console.log("error: ", error);
        error = JSON.stringify(error);
        error = JSON.parse(error);
        console.log("error logs: ", error);
        console.log("done");
        return;
    }
    
  }
  
}
////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////
// deactivate a helper alt
async function altDeactivate(_priority_,_alt_,_helius_,_close_=false) {
  let messageV0 = null;
  console.log("deactivate helper: "+_alt_);
  let connection = new solanaWeb3.Connection(_helius_, "confirmed");
  let alt_address = new solanaWeb3.PublicKey(_alt_);
  let deactiveALTIx = solanaWeb3.AddressLookupTableProgram.deactivateLookupTable({
  authority: provider.publicKey,lookupTable: alt_address,});
  /// ***
  let computeLimitIx = solanaWeb3.ComputeBudgetProgram.setComputeUnitLimit({units:other_cu,});
  let instructions = [computeLimitIx, deactiveALTIx];
  messageV0 = new solanaWeb3.TransactionMessage({
    payerKey: provider.publicKey,
    recentBlockhash: (await connection.getRecentBlockhash('confirmed')).blockhash,
    instructions: instructions,
  }).compileToV0Message([]);
  let tx = new solanaWeb3.VersionedTransaction(messageV0);
  let feeEstimate = await getPriorityFeeEstimate(_helius_, _priority_, tx);      
  console.log("fee estimate: ", feeEstimate);
  let computePriceIx = solanaWeb3.ComputeBudgetProgram.setComputeUnitPrice({microLamports: feeEstimate,});
  let final_instructions = instructions.slice();
  final_instructions.unshift(computePriceIx);
  messageV0 = new solanaWeb3.TransactionMessage({
    payerKey: provider.publicKey,
    recentBlockhash: (await connection.getRecentBlockhash('confirmed')).blockhash,
    instructions: final_instructions,
  }).compileToV0Message([]);
  tx = new solanaWeb3.VersionedTransaction(messageV0);      
  /// ***
  console.log("deactivating...", _alt_);
  try {
    let signature = null;
    let signedTx = null;
    if(keypair!=null){
      tx.sign([provider]);
      let signature = await connection.sendRawTransaction(tx.serialize(),{
        skipPreflight: true,
        maxRetries: 0 
      });
    }
    else{
      signedTx = await provider.signTransaction(tx);
      let signature = await connection.sendRawTransaction(signedTx.serialize(),{
        skipPreflight: true,
        maxRetries: 0 
      });
    }
    console.log("signature: ", signature);
    console.log("finalizing deactivation...", _alt_);
    let i = 0;
    let final = await finalized(signature,10,4);
    if(final != "finalized"){
      console.log("error : ", final);
      return;
    }
    console.log("helper deactivated: ", _alt_);
    // check slots to close
    let cs = 0;
    if(_close_==false){
      console.log("waiting to close...", _alt_);
      const check_slots = setInterval(async function() {
      let closing = await altClose(_priority_,_alt_,_helius_);
      if(closing=="ok"){
        clearInterval(check_slots);
        console.log("done");
      }
      else if(Number.isInteger(closing)){
        console.log("wait time: "+closing+" blocks...");
      }
      else{
        clearInterval(check_slots);
        console.log("...");
      }
      cs++;
      if(cs==10){
        clearInterval(check_slots);
        console.log("exceeded retry limit! ", _alt_);
        console.log("done");
      }
    },60000);
    }
  } 
  catch(error) {
    console.log("error : ", _alt_);
    console.log("error: ", error);
    error = JSON.stringify(error);
    error = JSON.parse(error);
    console.log("logs: ", error);
    return;
  }
}
////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////
// close a helper alt and recover the rent
async function altClose(_priority_,_alt_,_helius_) {
  let messageV0 = null;
  let connection = new solanaWeb3.Connection(_helius_,"confirmed");
  let alt_address = new solanaWeb3.PublicKey(_alt_);
  let closeALTIx = solanaWeb3.AddressLookupTableProgram.closeLookupTable({
    authority: provider.publicKey,
    lookupTable: alt_address,
    recipient: provider.publicKey,
  });
  /// ***
  let computeLimitIx = solanaWeb3.ComputeBudgetProgram.setComputeUnitLimit({units:other_cu,});
  let instructions = [computeLimitIx, closeALTIx];
  messageV0 = new solanaWeb3.TransactionMessage({
    payerKey: provider.publicKey,
    recentBlockhash: (await connection.getRecentBlockhash('confirmed')).blockhash,
    instructions: instructions,
  }).compileToV0Message([]);
  let tx = new solanaWeb3.VersionedTransaction(messageV0);
  let feeEstimate = await getPriorityFeeEstimate(_helius_, _priority_, tx);      
  console.log("fee estimate: ", feeEstimate);
  let computePriceIx = solanaWeb3.ComputeBudgetProgram.setComputeUnitPrice({microLamports: feeEstimate,});
  let final_instructions = instructions.slice();
  final_instructions.unshift(computePriceIx);
  messageV0 = new solanaWeb3.TransactionMessage({
    payerKey: provider.publicKey,
    recentBlockhash: (await connection.getRecentBlockhash('confirmed')).blockhash,
    instructions: final_instructions,
  }).compileToV0Message([]);
  tx = new solanaWeb3.VersionedTransaction(messageV0);      
  /// ***   
  console.log("attempting to close... ", _alt_);
  try {
    let signature = null;
    let signedTx = null;
    if(keypair!=null){
      tx.sign([provider]);
      let signature = await connection.sendRawTransaction(tx.serialize(),{
        skipPreflight: true,
        maxRetries: 0 
      });
    }
    else{
      signedTx = await provider.signTransaction(tx);
      let signature = await connection.sendRawTransaction(signedTx.serialize(),{
        skipPreflight: true,
        maxRetries: 0 
      });
    }
    console.log("signature: ", signature);
    console.log("finalizing rent recovery... ", _alt_);
    let i = 0;
    let final = await finalized(signature,10,4);
    if(final != "finalized"){
      console.log("error: ", final);
      return;
    }
    console.log("alt closed: ", _alt_);
    console.log("funds recovered: ", _alt_);
    console.log("done");
    return "ok";
  }
  catch(error) {
    for (let i = 0; i < error.logs.length; i++) {
      if(error.logs[i].includes("Table cannot be closed")){
        let str = error.logs[i];
        str = str.replace(/[^\d.]/g,'');
        str = parseInt(str);
        return str;
      }
    }
    console.log("error!");
    console.log(error);
    return;
  }
}
////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////
// routing
if(provider != null){(async() => {
  let commands = []; 
  let skipper = 0;
  process.argv.forEach(function (val, index, array) {
    if(skipper > 1){commands.push(val);}
    skipper++;
  });
  if(typeof commands[0]=="undefined" || typeof commands[1]=="undefined"){
    console.log("method and token id required");
    return;
  }
  if(commands[0]=="torch"){
    if(typeof commands[2] != "undefined" && commands[2] == "true"){
      await mcburn(commands[1],priority,rpc,burner,static_alt,true);
    }
    else{
      await mcburn(commands[1],priority,rpc,burner,static_alt);
    }
  }
  else if(commands[0]=="retry"){
    if(typeof commands[2] != "undefined" && commands[2] == "true"){
      await mcburn(commands[1],priority,rpc,burner,static_alt,true,commands[3]);
    }
    else{
      await mcburn(commands[1],priority,rpc,burner,static_alt,false,commands[3]);
    }
  }
  else if(commands[0]=="deactivate"){
    if(typeof commands[2] != "undefined" && commands[2] == "true"){
      await altDeactivate(priority,commands[1],rpc,true);
    }
    else{
      await altDeactivate(priority,commands[1],rpc);
    }
  }
  else if(commands[0]=="close"){
    await altClose(priority,commands[1],rpc);
  }
})();}
////////////////////////////////////////////////////////////////////////////////
