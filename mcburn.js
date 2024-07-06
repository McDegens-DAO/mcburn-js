////////////////////////////////////////////////////////////////////////////////
// name: mcburn.js
// version: 2.0.0
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
import {keypair, rpc, priority, throttle, tolerance, burner} from './config.js';
let Buffer = buffer.Buffer;
let provider = null;
let connection = null;
const static_alt = "6NVtn6zJDzSpgPxPRtd6UAoWkDxmuqv2HgCLLJEeQLY";
const BUBBLEGUM = "BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY";
////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////
// define wallet provider here
if(keypair!=null){
  provider=solanaWeb3.Keypair.fromSecretKey(new Uint8Array(keypair));
  console.log("private key in use!");
}
////////////////////////////////////////////////////////////////////////////////

///////////////////////////////////////////////////////////////////////////////////////////
async function getPriorityFeeEstimate(connection,provider,cluster,priorityLevel,instructions,tables=false) {
  let re_ix = [];
  for (let o in instructions) {re_ix.push(instructions[o]);}
  instructions = re_ix;
  let _msg = null;
  if(tables==false){
    _msg = new solanaWeb3.TransactionMessage({
      payerKey: provider.publicKey,
      recentBlockhash: (await connection.getLatestBlockhash('confirmed')).blockhash,
      instructions: instructions,
    }).compileToV0Message([]);
  }
  else{
    _msg = new solanaWeb3.TransactionMessage({
      payerKey: provider.publicKey,
      recentBlockhash: (await connection.getLatestBlockhash('confirmed')).blockhash,
      instructions: instructions,
    }).compileToV0Message([tables]);
  }
  let tx = new solanaWeb3.VersionedTransaction(_msg);
  let response = await fetch(cluster, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "1",
      method: "getPriorityFeeEstimate",
      params: [
        {
          transaction: bs58.encode(tx.serialize()), // Pass the serialized transaction in Base58
          options: { priorityLevel: priorityLevel },
        },
      ],
    }),
  });
  let data = await response.json();
  data = parseInt(data.result.priorityFeeEstimate);
  console.log("fee: ", data);
  if(data < 10000){data=10000;console.log("adjusted: ", data);}
  return data;
}
async function getComputeLimit(connection,opti_payer,opti_ix,opti_tables=false) {
  let opti_sim_limit = solanaWeb3.ComputeBudgetProgram.setComputeUnitLimit({units:1400000});
  let re_ix = [];
  for (let o in opti_ix) {re_ix.push(opti_ix[o]);}
  opti_ix = re_ix;
  opti_ix.unshift(opti_sim_limit);
  let opti_msg = null;
  if(opti_tables == false){
    opti_msg = new solanaWeb3.TransactionMessage({
      payerKey: provider.publicKey,
      recentBlockhash: (await connection.getLatestBlockhash('confirmed')).blockhash,
      instructions: opti_ix,
    }).compileToV0Message([]);
  }
  else{
    opti_msg = new solanaWeb3.TransactionMessage({
      payerKey: provider.publicKey,
      recentBlockhash: (await connection.getLatestBlockhash('confirmed')).blockhash,
      instructions: opti_ix,
    }).compileToV0Message([opti_tables]);
  }
  let opti_tx = new solanaWeb3.VersionedTransaction(opti_msg);    
  let opti_cu_res = await connection.simulateTransaction(opti_tx,{replaceRecentBlockhash:true,sigVerify:false,});
  // console.log("simulation: ", opti_cu_res.value.logs);
  let opti_consumed = opti_cu_res.value.unitsConsumed;
  let opti_cu_limit = Math.ceil(opti_consumed * tolerance);
  console.log("compute: ", opti_cu_limit);
  return opti_cu_limit;
}
async function finalized(sig,max=10,int=4,checkslots=false){
  return await new Promise(resolve => {
    let start = 1;
    let connection = new solanaWeb3.Connection(rpc, "confirmed");
    let intervalID = setInterval(async()=>{
      let tx_status = null;
      tx_status = await connection.getSignatureStatuses([sig], {searchTransactionHistory: true,});
      console.log(start+": "+sig);
      if (
        typeof tx_status != "undefined" && 
        tx_status != null && 
        typeof tx_status.value != "undefined"
      ){ 
        console.log("status: ", tx_status.value);
      }
      else{
        console.log("failed to get status, trying again...");
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
      else if(tx_status.value[0].confirmationStatus == "confirmed"){
        start = 1;
      }
      else if (tx_status.value[0].confirmationStatus == "finalized"){
        if(tx_status.value[0].err != null){
          resolve(tx_status.value[0].err);
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
///////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////
// burn cnft
async function mcburn(_asset_,_priority_,_helius_,_program_,_alt_,_deactivate_=false,_retry_=false) { 
  
  let connection = new solanaWeb3.Connection(_helius_, "confirmed");
  let assetId = _asset_;
  console.log("asset: ", assetId);

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
  console.log("leaf_delegate: ", leafDelegate.toString());  
  console.log("owner: ", getAsset.data.result.ownership.owner);
  if (getAsset.data.result.ownership.owner != provider.publicKey) {
    console.log("Asset Not Owned by Provider");
    return;
  }
  if (getAsset.data.result.burnt === true) {
    console.log("Asset Already Burned!");
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
  console.log("tree_authority: ", treeAuthorityPDA.toString());
  console.log("canopy_depth: ", canopyDepth);
  
  const proof = getAssetProof.data.result.proof
  .slice(0, getAssetProof.data.result.proof.length - (!!canopyDepth ? canopyDepth : 0))
  .map((node) => ({
    pubkey: new solanaWeb3.PublicKey(node),
    isWritable: false,
    isSigner: false,
  }));
  
  var totalSize = 1 + 32 + 32 + 32 + 32 + 8 + 1;
  console.log("size: ", totalSize);
  
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
  
  let burnCNFTIx = new solanaWeb3.TransactionInstruction({
    programId: cNFTBurnerProgramId,
    data: Buffer.from(uarray),
    keys: keys,
  });
  
  let mainALTAddress = new solanaWeb3.PublicKey(_alt_);  
  let mainALTAccount = await connection.getAddressLookupTable(mainALTAddress).then((res) => res.value);
  if (!mainALTAccount) {
    console.log("Could not fetch ALT!");
    return;
  }  
  console.log("static alt: ", _alt_);
  console.log("proofs: ", proof.length);
  console.log("retrying: ", _retry_);
  
  if(_retry_!=false){

    let proofALTAddress = new solanaWeb3.PublicKey(_retry_);  
    let proofALTAccount = await connection.getAddressLookupTable(proofALTAddress).then((res) => res.value);    
    if (!proofALTAccount) {
      console.log("Could not fetch proof ALT!");
      console.log("done!");
      return;
    }
    console.log("alt found");
    
    console.log("burning: "+assetId);
    await new Promise(_=>setTimeout(_,throttle));
    let instructions = [burnCNFTIx];
    // ***
    instructions.unshift(solanaWeb3.ComputeBudgetProgram.setComputeUnitLimit({units:await getComputeLimit(connection,provider.publicKey,instructions,proofALTAccount)}));
    instructions.unshift(solanaWeb3.ComputeBudgetProgram.setComputeUnitPrice({microLamports:await getPriorityFeeEstimate(connection,provider,rpc,priority,instructions,proofALTAccount)}));
    let messageV0 = new solanaWeb3.TransactionMessage({
      payerKey: provider.publicKey,
      recentBlockhash: (await connection.getLatestBlockhash('confirmed')).blockhash,
      instructions: instructions,
    }).compileToV0Message([proofALTAccount]);
    let tx = new solanaWeb3.VersionedTransaction(messageV0);
    // ***   
    
    try {
      let signature = null;
      let signedTx = null;
      if(keypair!=null){
        console.log("signing with keypair...");
        tx.sign([provider]);
        console.log("sending transaction...");
        signature = await connection.sendRawTransaction(tx.serialize(),{
          skipPreflight: true,
          maxRetries: 0 
        });
      }
      else{
        console.log("signing with provider...");
        signedTx = await provider.signTransaction(tx);
        signature = await connection.sendRawTransaction(signedTx.serialize(),{
          skipPreflight: true,
          maxRetries: 0 
        });           
      }
      console.log("signature: ", signature);
      console.log("checking status: ", assetId);
      await new Promise(_=>setTimeout(_,throttle));
      let i = 0;
      let final = await finalized(signature,10,4);
      if(final != "finalized"){
        console.log("replay error!");
        console.log(final);
        console.log("running the following command to try again");
        if(_deactivate_==false){
          console.log("npm run mcburn retry "+assetId+" false "+proofALTAddress.toBase58());
        }
        else{
          console.log("npm run mcburn retry "+assetId+" true "+proofALTAddress.toBase58());
        }
        console.log("done!");
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
      console.log(error);
      console.log("done! (z)");
    }    

  }
  else if (proof.length <= 20) {
    
    console.log("burning... ", _asset_);
    await new Promise(_=>setTimeout(_,throttle));
    let instructions = [burnCNFTIx];
    
    // ***
    instructions.unshift(solanaWeb3.ComputeBudgetProgram.setComputeUnitLimit({units:await getComputeLimit(connection,provider.publicKey,instructions,mainALTAccount)}));
    instructions.unshift(solanaWeb3.ComputeBudgetProgram.setComputeUnitPrice({microLamports:await getPriorityFeeEstimate(connection,provider,rpc,priority,instructions,mainALTAccount)}));
    let messageV0 = new solanaWeb3.TransactionMessage({
      payerKey: provider.publicKey,
      recentBlockhash: (await connection.getLatestBlockhash('confirmed')).blockhash,
      instructions: instructions,
    }).compileToV0Message([mainALTAccount]);
    let tx = new solanaWeb3.VersionedTransaction(messageV0);
    // ***
    
    try {
      let signature = null;
      let signedTx = null;
      if(keypair!=null){
        console.log("DEBUG 1");
        tx.sign([provider]);
        signature = await connection.sendRawTransaction(tx.serialize(),{
          skipPreflight: true,
          maxRetries: 0 
        });
      }
      else{
        console.log("DEBUG 2");
        signedTx = await provider.signTransaction(tx);
        signature = await connection.sendRawTransaction(signedTx.serialize(),{
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
        console.log("done!");
        return;
      }
      console.log("asset burned: ", _asset_);
      console.log("signature:", signature);
      console.log("done!");
      return "ok";
    }
    catch(error) {
      console.log("error: ", error);
      console.log("done!");
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
    console.log("proof.length: ", proof.length);
    let proofPubkeys = [];
    for (let i = 0; i < (proof.length-20); i++) {
      proofPubkeys.push(proof[i].pubkey);
    }
    console.log("proofPubkeys: ", proofPubkeys);

    // let helperALTpub = new solanaWeb3.PublicKey(proofALTAddress.toBase58());  
    // let helperALTaccount = await connection.getAddressLookupTable(helperALTpub).then((res) => res.value);
    // if (!helperALTaccount) {
    //   console.log("Could not fetch helper ALT!");
    //   console.log("done!");
    //   return;
    // }
    
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
    let instructions = [createALTIx, extendALTIx];

    await new Promise(_=>setTimeout(_,throttle));
    
    // ***
    instructions.unshift(solanaWeb3.ComputeBudgetProgram.setComputeUnitLimit({units:await getComputeLimit(connection,provider.publicKey,instructions,mainALTAccount)}));
    instructions.unshift(solanaWeb3.ComputeBudgetProgram.setComputeUnitPrice({microLamports:await getPriorityFeeEstimate(connection,provider,rpc,priority,instructions,mainALTAccount)}));
    let messageV0 = new solanaWeb3.TransactionMessage({
      payerKey: provider.publicKey,
      recentBlockhash: (await connection.getLatestBlockhash('confirmed')).blockhash,
      instructions: instructions,
    }).compileToV0Message([mainALTAccount]);
    let tx = new solanaWeb3.VersionedTransaction(messageV0);
    // ***
    
    try {
      
      let signature = null;
      let signedTx = null;
      if(keypair!=null){
        tx.sign([provider]);
        signature = await connection.sendRawTransaction(tx.serialize(),{
          skipPreflight: true,
          maxRetries: 0 
        }); 
      }
      else{
        signedTx = await provider.signTransaction(createALTTx);
        signature = await connection.sendRawTransaction(signedTx.serialize(),{
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
      let instructions = [burnCNFTIx];
      
      // ***
      instructions.unshift(solanaWeb3.ComputeBudgetProgram.setComputeUnitLimit({units:await getComputeLimit(connection,provider.publicKey,instructions,proofALTAccount)}));
      instructions.unshift(solanaWeb3.ComputeBudgetProgram.setComputeUnitPrice({microLamports:await getPriorityFeeEstimate(connection,provider,rpc,priority,instructions,proofALTAccount)}));
      let messageV0 = new solanaWeb3.TransactionMessage({
        payerKey: provider.publicKey,
        recentBlockhash: (await connection.getLatestBlockhash('confirmed')).blockhash,
        instructions: instructions,
      }).compileToV0Message([proofALTAccount]);
      tx = new solanaWeb3.VersionedTransaction(messageV0);
      /// *** 
      
      try {
        let signature = null;
        let signedTx = null;
        if(keypair!=null){
          tx.sign([provider]);
          signature = await connection.sendRawTransaction(tx.serialize(),{
            skipPreflight: true,
            maxRetries: 0 
          }); 
        }
        else{
          signedTx = await provider.signTransaction(tx);
          signature = await connection.sendRawTransaction(signedTx.serialize(),{
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
          console.log(final);
          console.log("run the following command to try again");
          if(_deactivate_==false){
            console.log("npm run mcburn retry "+assetId+" false "+proofALTAddress.toBase58());
          }
          else{
            console.log("npm run mcburn retry "+assetId+" true "+proofALTAddress.toBase58());
          }              
          console.log("done!");
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
        error = JSON.stringify(error);
        error = JSON.parse(error); 
        console.log(error);
        console.log("done!");
        return;
      }
      
    } 
    catch(error) {
        console.log("error: ", error);
        error = JSON.stringify(error);
        error = JSON.parse(error);
        console.log("error logs: ", error);
        console.log("done!");
        return;
    }
    
  }
  
}
////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////
// deactivate a helper alt
async function altDeactivate(_priority_,_alt_,_helius_,_close_=false) {
  console.log("deactivate helper: "+_alt_);
  let connection = new solanaWeb3.Connection(_helius_, "confirmed");
  let alt_address = new solanaWeb3.PublicKey(_alt_);
  let deactiveALTIx = solanaWeb3.AddressLookupTableProgram.deactivateLookupTable({
  authority: provider.publicKey,lookupTable: alt_address,});
  let instructions = [deactiveALTIx];
  // ***
  instructions.unshift(solanaWeb3.ComputeBudgetProgram.setComputeUnitLimit({units:await getComputeLimit(connection,provider.publicKey,instructions)}));
  instructions.unshift(solanaWeb3.ComputeBudgetProgram.setComputeUnitPrice({microLamports:await getPriorityFeeEstimate(connection,provider,rpc,priority,instructions)}));
  let messageV0 = new solanaWeb3.TransactionMessage({
    payerKey: provider.publicKey,
    recentBlockhash: (await connection.getLatestBlockhash('confirmed')).blockhash,
    instructions: instructions,
  }).compileToV0Message([]);
  let tx = new solanaWeb3.VersionedTransaction(messageV0);
  // *** 
  console.log("deactivating...", _alt_);
  try {
    let signature = null;
    let signedTx = null;
    if(keypair!=null){
      tx.sign([provider]);
      signature = await connection.sendRawTransaction(tx.serialize(),{
        skipPreflight: true,
        maxRetries: 0 
      });
    }
    else{
      signedTx = await provider.signTransaction(tx);
      signature = await connection.sendRawTransaction(signedTx.serialize(),{
        skipPreflight: true,
        maxRetries: 0 
      });
    }
    console.log("signature: ", signature);
    console.log("finalizing deactivation...", _alt_);
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
      let closing = await altClose(_priority_,_alt_,_helius_,true);
      if(closing=="ok"){
        clearInterval(check_slots);
        await altClose(_priority_,_alt_,_helius_,false);
      }
      else if(Number.isInteger(closing)){
        console.log("wait time: "+closing+" blocks...");
      }
      else{
        clearInterval(check_slots);
        console.log("simulation error");
        console.log(closing);
        console.log("...");
        cs++;
      }
      if(cs==6){
        clearInterval(check_slots);
        console.log("exceeded retry limit! ", _alt_);
        console.log("done!");
      }
    },20000);
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
async function altClose(_priority_,_alt_,_helius_,_simulate_=false) {
  let connection = new solanaWeb3.Connection(_helius_,"confirmed");
  let alt_address = new solanaWeb3.PublicKey(_alt_);
  let closeALTIx = solanaWeb3.AddressLookupTableProgram.closeLookupTable({
    authority: provider.publicKey,
    lookupTable: alt_address,
    recipient: provider.publicKey,
  });
  let instructions = [closeALTIx];

  if(_simulate_!=false){

    instructions.unshift(solanaWeb3.ComputeBudgetProgram.setComputeUnitLimit({units:1400000}));
    let messageV0 = new solanaWeb3.TransactionMessage({
      payerKey: provider.publicKey,
      recentBlockhash: (await connection.getLatestBlockhash('confirmed')).blockhash,
      instructions: instructions,
    }).compileToV0Message([]);
    let tx = new solanaWeb3.VersionedTransaction(messageV0);

    console.log("checking blocks...");
    
    let _test_ = await connection.simulateTransaction(tx,{replaceRecentBlockhash:true,sigVerify:false,});
    for (let i = 0; i < _test_.value.logs.length; i++) {
      let line = _test_.value.logs[i];
      if(line.includes("Table cannot be closed")){
        let str = line.replace(/[^\d.]/g,'');
        str = parseInt(str);
        return str;
      }
      else if(line.includes("Program AddressLookupTab1e1111111111111111111111111 success")){
        return "ok";
      }
    }
    return _test_.value;
  }
  else{

    instructions.unshift(solanaWeb3.ComputeBudgetProgram.setComputeUnitLimit({units:await getComputeLimit(connection,provider.publicKey,instructions)}));
    instructions.unshift(solanaWeb3.ComputeBudgetProgram.setComputeUnitPrice({microLamports:await getPriorityFeeEstimate(connection,provider,rpc,priority,instructions)}));
    let messageV0 = new solanaWeb3.TransactionMessage({
      payerKey: provider.publicKey,
      recentBlockhash: (await connection.getLatestBlockhash('confirmed')).blockhash,
      instructions: instructions,
    }).compileToV0Message([]);
    let tx = new solanaWeb3.VersionedTransaction(messageV0);

    console.log("attempting to close... ", _alt_);
    try {

      let signature = null;
      let signedTx = null;
      if(keypair!=null){
        tx.sign([provider]);
        signature = await connection.sendRawTransaction(tx.serialize(),{
          skipPreflight: true,
          maxRetries: 0 
        });
      }
      else{
        signedTx = await provider.signTransaction(tx);
        signature = await connection.sendRawTransaction(signedTx.serialize(),{
          skipPreflight: true,
          maxRetries: 0 
        });
      }

      console.log("signature: ", signature);
      console.log("recovering rent... ", _alt_);
      let final = await finalized(signature,10,4);
      if(final != "finalized"){
        console.log("error: ", final);
        console.log("retry closing the alt with: ");
        console.log("npm run mcburn close "+_alt_);
        console.log("done!");
        return;
      }
      console.log("alt closed: ", _alt_);
      console.log("funds recovered: ", _alt_);
      console.log("done!");
      return;
    }
    catch(error) {
      console.log("error!");
      console.log("retry closing the alt with: ");
      console.log("npm run mcburn close "+_alt_);
      console.log("done!");
      return;
    }
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
