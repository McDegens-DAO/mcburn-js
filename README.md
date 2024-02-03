# mcburn-js

A javascript example calling the mcburn cNFT burner program.

# ATTN!

This repo is derived from working code however this repo itself has not been tested.

You can find the OSS Rust repo here: https://github.com/honeygrahams2/mcburn

Deployed Program Id: GwR3T5wAAWRCCNyjCs2g9aUM7qAtwNBsn2Z515oGTi7i

# Helper ALT?
(aka lookup table)

In some cases multiple transactions are required to burn stubborn cNFTS.

For example if there are > 23 proofs passed in the ix, there will first need to be a tx to create a *Helper ALT* prior to the burn transaction.

**Recouping ALT Rent**

Since the ALT requires rent you have to save the *Helper ALT* address so that you can deactivate it and close it to recover funds. Please note that only the ALT creator can perform these actions and reclaim funds. When a *Helper ALT* is created the console logs will display this message followed by the *Helper ALT* address: 

"SAVE THIS ALT ADDRESS TO DEACTIVATE AND CLOSE LATER TO RECOUP FUNDS!"

**Deactivating & Closing the ALT**

There are some timing events that have to be considered. You can not deactivate a *Helper ALT* imediately after burning and you can not close a *Helper ALT* imediately after deactivating it. The timing required may be by slots passed or blockhash expiration, we don't know yet. Currently we're just waiting 5 minutes after the burn to deactivate, and then another 5 min before closing. We will run more tests to narrow this timing down and dumify the flow.

# Devs

Burner apps may want to consider handling the Helper ALT creation and reclaiming of funds on their backend to simplify the front end flow for their users.
