# mcburn-js

A javascript example calling the mcburn cNFT burner program.

# ATTN!

This repo is derived from working code however this repo itself has not been tested.

You can find the OSS Rust repo here: https://github.com/honeygrahams2/mcburn

Deployed Program Id: GwR3T5wAAWRCCNyjCs2g9aUM7qAtwNBsn2Z515oGTi7i

# ALT? 
(aka lookup table)

In some cases multiple transactions are required to burn stubborn cNFTS.

For example if there are > 23 proofs passed in the burn ix, there will first be a tx to create a required *Helper ALT*, followed by the burn transaction.

Since the ALT requires rent you should save the *Helper ALT* address so that you can deactivate it and close it to recover funds. Please note that only the signer can reclaim funds.

In the example, if a Helper ALT is created the console logs will display this message followed by the *Helper ALT* address: 

"SAVE THIS ALT ADDRESS TO DEACTIVATE AND CLOSE LATER TO RECOUP FUNDS!"

Please note that there are some timing events that have to be considered. You can not deactivate an ALT imediately after burning and you can not close an ALT imediately after deactivating it. Timing required may be by slots passed or blockhash expiration, we don't know yet. Currently we're just waiting 5 minutes after the burn to deactivate, and then another 5 min before closing. We will run more tests to narrow this timing down and dumify the flow.

Burner apps may want to consider handling the Helper ALT creation and reclaiming of funds on their backend to simplify the front end flow for their users.
