////////////////////////////////////////////////////////////////////////////////
// imports
import axios from "axios";
import * as mplBubblegum from "@metaplex-foundation/mpl-bubblegum";
import * as solanaWeb3 from "@solana/web3.js";
import * as splAccountCompression from "@solana/spl-account-compression";
import * as bs58 from "bs58";
import * as buffer from "buffer";
let Buffer = buffer.Buffer;
let provider = null;
let connection = null;
////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////
// settings
const burner_program = "FRRYhLWhGZYb63HEwuVTu5VY7EY3Gwr9UXTc84ghwCiu";
const static_alt = "6NVtn6zJDzSpgPxPRtd6UAoWkDxmuqv2HgCLLJEeQLY";
const cluster = "https://rpc.helius.xyz/?api-key=XXXXXXXXXXXXXXXXXXXXXXXXXX";
////////////////////////////////////////////////////////////////////////////////


// wallet connection logic is necessary to define and connect "provider"


////////////////////////////////////////////////////////////////////////////////
// functions
async function deactivateALT(_alt_) {
  console.log("deactivating alt "+_alt_);
  let alt_address = new solanaWeb3.PublicKey(_alt_);
  let deactiveALTIx = solanaWeb3.AddressLookupTableProgram.deactivateLookupTable({
    authority: provider.publicKey,
    lookupTable: alt_address,
  });
  let tx = new solanaWeb3.Transaction();
  tx.add(deactiveALTIx);
  tx.recentBlockhash = (await connection.getRecentBlockhash('confirmed')).blockhash;
  tx.feePayer = provider.publicKey;
  try {
    let signedTransaction = await provider.signTransaction(tx);
    const serializedTransaction = signedTransaction.serialize();
    const signature = await connection.sendRawTransaction(serializedTransaction,
    { skipPreflight: false, preflightCommitment: 'confirmed' },);        
    console.log(`https://solscan.io/tx/${signature}?cluster=mainnet`);
  } 
  catch(error) {
    console.log("Error: ", error);
    error = JSON.stringify(error);
    error = JSON.parse(error);
    console.log("Error Logs: ", error);
  }
}

async function closeALT(_alt_) {
  console.log("closing alt "+_alt_);
  let alt_address = new solanaWeb3.PublicKey(_alt_);
  let closeALTIx = solanaWeb3.AddressLookupTableProgram.closeLookupTable({
    authority: provider.publicKey,
    lookupTable: alt_address,
    recipient: provider.publicKey,
  });
  let tx = new solanaWeb3.Transaction();
  tx.add(closeALTIx);
  tx.recentBlockhash = (await connection.getRecentBlockhash('confirmed')).blockhash;
  tx.feePayer = provider.publicKey;
  try {
    let signedTransaction = await provider.signTransaction(tx);
    const serializedTransaction = signedTransaction.serialize();
    const signature = await connection.sendRawTransaction(
        serializedTransaction,
        { skipPreflight: false, preflightCommitment: 'confirmed' },
    );        
    console.log(`https://solscan.io/tx/${signature}?cluster=mainnet`);    
  }
  catch(error) {
    console.log("Error: ", error);
    error = JSON.stringify(error);
    error = JSON.parse(error);  
    console.log("Error Logs: ", error);
    return;
  }  
}

async function mcburnjs(_asset_,_helius_,_program_,_alt_) { 
  
    let connection = new solanaWeb3.Connection(_helius_, "confirmed");

    let assetId = _asset_;    
    console.log("assetId ", assetId);
    
    let cNFTBurnerProgramId = new solanaWeb3.PublicKey(_program_);
    let heliusUrl = _helius_;
    
    const axiosInstance = axios.create({
        baseURL: heliusUrl,
    });
    
    const getAsset = await axiosInstance.post(heliusUrl, {
        jsonrpc: "2.0",
        method: "getAsset",
        id: "rpd-op-123",
        params: {
            id: assetId
        },
    });
    console.log("getAsset ", getAsset);
    console.log("data_hash ", getAsset.data.result.compression.data_hash);
    console.log("creator_hash ", getAsset.data.result.compression.creator_hash);
    console.log("leaf_id ", getAsset.data.result.compression.leaf_id);

    let leafDelegate = provider.publicKey;
    if (getAsset.data.result.ownership.delegated == true) {
        leafDelegate = new solanaWeb3.PublicKey(getAsset.data.result.ownership.delegate);
    }
    console.log("leafDelegate ", leafDelegate.toString());

    console.log("getAsset.data.result.ownership.owner ", getAsset.data.result.ownership.owner);

    if (getAsset.data.result.ownership.owner != provider.publicKey) {
        console.log("Asset Not Owned by Provider");
        return;
    }

    if (getAsset.data.result.burnt == true) {
        console.log("Asset Already Burned");
        return;
    }

    const getAssetProof = await axiosInstance.post(heliusUrl, {
        jsonrpc: "2.0",
        method: "getAssetProof",
        id: "rpd-op-123",
        params: {
            id: assetId
        },
    });
    console.log("getAssetProof ", getAssetProof);
    console.log("tree_id ", getAssetProof.data.result.tree_id);
    console.log("proof ", getAssetProof.data.result.proof);
    console.log("root ", getAssetProof.data.result.root);

    const treeAccount = await splAccountCompression.ConcurrentMerkleTreeAccount.fromAccountAddress(
    connection, new solanaWeb3.PublicKey(getAssetProof.data.result.tree_id),);  
    const treeAuthorityPDA = treeAccount.getAuthority();
    const canopyDepth = treeAccount.getCanopyDepth();
    console.log("treeAuthorityPDA ", treeAuthorityPDA.toString());
    console.log("canopyDepth ", canopyDepth);

    // parse the list of proof addresses into a valid AccountMeta[]
    const proof = getAssetProof.data.result.proof
    .slice(0, getAssetProof.data.result.proof.length - (!!canopyDepth ? canopyDepth : 0))
    .map((node) => ({
        pubkey: new solanaWeb3.PublicKey(node),
        isWritable: false,
        isSigner: false,
    }));
    console.log("proof ", proof);
    
    let totalSize = 1 + 32 + 32 + 32 + 32 + 8 + 1;
    console.log("totalSize", totalSize);

    let uarray = new Uint8Array(totalSize);
    let counter = 0;    
    uarray[counter++] = 0; // 0 = cnft_burner instruction
  
    let arr;

    let assetIdb58 = bs58.decode(assetId);
    arr = Array.prototype.slice.call(Buffer.from(assetIdb58), 0);
    for (let i = 0; i < arr.length; i++) {
        uarray[counter++] = arr[i];
    }
  
    let rootb58 = bs58.decode(getAssetProof.data.result.root);
    arr = Array.prototype.slice.call(Buffer.from(rootb58), 0);
    for (let i = 0; i < arr.length; i++) {
        uarray[counter++] = arr[i];
    }
    
    let datahashb58 = bs58.decode(getAsset.data.result.compression.data_hash);
    arr = Array.prototype.slice.call(Buffer.from(datahashb58), 0);
    for (let i = 0; i < arr.length; i++) {
        uarray[counter++] = arr[i];
    }
    
    let creatorhashb58 = bs58.decode(getAsset.data.result.compression.creator_hash);
    arr = Array.prototype.slice.call(Buffer.from(creatorhashb58), 0);
    for (let i = 0; i < arr.length; i++) {
        uarray[counter++] = arr[i];
    }

    let byteArray = [0, 0, 0, 0, 0, 0, 0, 0];
    for (let index = 0; index < byteArray.length; index ++ ) {
        let byte = getAsset.data.result.compression.leaf_id & 0xff;
        byteArray [ index ] = byte;
        getAsset.data.result.compression.leaf_id = (getAsset.data.result.compression.leaf_id - byte) / 256 ;
    }
    for (let i = 0; i < byteArray.length; i++) {
        uarray[counter++] = byteArray[i];
    }

    uarray[counter++] = proof.length;

    console.log("Contract Data: ", uarray);
    
    let keys = [
        { pubkey: provider.publicKey, isSigner: true, isWritable: true }, // 0
        { pubkey: leafDelegate, isSigner: false, isWritable: true }, // 1
        { pubkey: new solanaWeb3.PublicKey(getAssetProof.data.result.tree_id), isSigner: false, isWritable: true }, // 2
        { pubkey: treeAuthorityPDA, isSigner: false, isWritable: true }, // 3
        { pubkey: splAccountCompression.PROGRAM_ID, isSigner: false, isWritable: false }, // 4
        { pubkey: splAccountCompression.SPL_NOOP_PROGRAM_ID, isSigner: false, isWritable: false }, // 5
        { pubkey: solanaWeb3.SystemProgram.programId, isSigner: false, isWritable: false }, // 6
        { pubkey: mplBubblegum.PROGRAM_ID, isSigner: false, isWritable: false }, // 7
    ];
    for (let i = 0; i < proof.length; i++) {
        keys.push(proof[i]);
    }
    console.log("keys ", keys);
    
    const burnCNFTIx = new solanaWeb3.TransactionInstruction({
        programId: cNFTBurnerProgramId,
        data: Buffer.from(uarray),
        keys: keys,
    });
    console.log("Burn cNFT Ix: ", burnCNFTIx);
    
    const computePriceIx = solanaWeb3.ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: 500,
    });
    
    let mainALTAddress = new solanaWeb3.PublicKey(_alt_);
	  const mainALTAccount = await connection.getAddressLookupTable(mainALTAddress).then((res) => res.value);
    if (!mainALTAccount) {
        console.log("Could not fetch ALT!");
        return;
    }
    
    let messageV0 = null;
    if (proof.length > 23) {
        const slot = await connection.getSlot();
        const [createALTIx, proofALTAddress] =
        solanaWeb3.AddressLookupTableProgram.createLookupTable({
            authority: provider.publicKey,
            payer: provider.publicKey,
            recentSlot: slot,
        });
        console.log("Proof Lookup Table Address", proofALTAddress.toBase58());

        let proofPubkeys = [];
        for (let i = 0; i < proof.length - 23; i++) {
            proofPubkeys.push(proof[i].pubkey);
        }
        console.log("proofPubkeys ", proofPubkeys);

        let extendALTIx = solanaWeb3.AddressLookupTableProgram.extendLookupTable({
            payer: provider.publicKey,
            authority: provider.publicKey,
            lookupTable: proofALTAddress,
            addresses: [
                cNFTBurnerProgramId,
                splAccountCompression.PROGRAM_ID,
                splAccountCompression.SPL_NOOP_PROGRAM_ID,
                solanaWeb3.SystemProgram.programId,
                mplBubblegum.PROGRAM_ID,
                ...proofPubkeys,                
            ],
        });
        console.log("extendALTIx ", extendALTIx);

        let altMessageV0 = new solanaWeb3.TransactionMessage({
            payerKey: provider.publicKey,
            recentBlockhash: (await connection.getRecentBlockhash('confirmed')).blockhash,
            instructions: [createALTIx, extendALTIx],
        }).compileToV0Message([mainALTAccount]);

        const createALTTx = new solanaWeb3.VersionedTransaction(altMessageV0);
        try {
            let signedTx = await provider.signTransaction(createALTTx);
            const txId = await connection.sendTransaction(signedTx);
            console.log("Signature: ", txId)
            console.log(`https://solscan.io/tx/${txId}?cluster=mainnet`);
        } catch(error) {
            console.log("Error: ", error)
            error = JSON.stringify(error);
            error = JSON.parse(error);
            console.log("Error Logs: ", error)
            return;
        }

        await new Promise(_ => setTimeout(_, 10000));
        
        const proofALTAccount = await connection
            .getAddressLookupTable(proofALTAddress)
            .then((res) => res.value);    
        if (!proofALTAccount) {
            console.log("Could not fetch proof ALT!");
            return;
        }

        messageV0 = new solanaWeb3.TransactionMessage({
            payerKey: provider.publicKey,
            recentBlockhash: (await connection.getRecentBlockhash('confirmed')).blockhash,
            instructions: [computePriceIx, burnCNFTIx],
        }).compileToV0Message([proofALTAccount]);
    } 
    else {
      messageV0 = new solanaWeb3.TransactionMessage({
        payerKey: provider.publicKey,
        recentBlockhash: (await connection.getRecentBlockhash('confirmed')).blockhash,
        instructions: [computePriceIx, burnCNFTIx],
      }).compileToV0Message([mainALTAccount]);
    }
    console.log("messageV0 ", messageV0);
    
    const tx = new solanaWeb3.VersionedTransaction(messageV0);
    try {
        let signedTx = await provider.signTransaction(tx);
        const txId = await connection.sendTransaction(signedTx);
        console.log("Signature: ", txId)
        console.log(`https://solscan.io/tx/${txId}?cluster=mainnet`);
    } 
    catch(error) {
        console.log("Error: ", error)
        error = JSON.stringify(error);
        error = JSON.parse(error);
        console.log("Error Logs: ", error)
        return;
    }
  
}
////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////
// usage
if(provider != null){

// usage - asset id, program id, static alt address, helius endpoint
mcburnjs("5CtTN62isci9KxLeAPHkFb2pxzP6NDkVLMo9bseu7WpJ",cluster,burner_program,static_alt);

// if the extra alt was created then you can deactivate it after (n)?
//   deactivateALT("XXXXXXXXXXXXXXXXXXXXXXXXXXXX");

// after deactivation you can colose the alt to recover funds after (n)?
//   closeALT("XXXXXXXXXXXXXXXXXXXXXXXXXXXX");

}
////////////////////////////////////////////////////////////////////////////////
