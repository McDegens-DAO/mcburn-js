# mcburn-js

A javascript example calling the mcburn cNFT burner program.

ATTN!

This repo is derived from working code however this repo itself has not been tested.

You can find the OSS Rust repo here: https://github.com/honeygrahams2/mcburn

When running mcburnjs()

If there are > 23 proofs required, a tx to create a helper ALT is required before the burn. Since ALTs cost SOL, you should save the helper ALT's address so that you can deactivate it and then close it to recover funds. 

If a helper ALT is created, in the console logs you will see this output: 

"SAVE THIS ALT ADDRESS TO DEACTIVATE AND CLOSE LATER TO RECOUP FUNDS!"

followed by the Helper ALT's address you need to save.

Please note there are some timing events that have to be considered.

You can not deactivate an ALT imediately after burning and you can not close an ALT imediately after deactivating it. 

Timing required may be by slots passed or blockhash expiration.

Currently we're just waiting 5 minutes after the burn to deactivate, and then another 5 min before closing.

We will run more tests to narrow this timing down and dumify the flow.

Burner apps may want to consider handling the Helper ALT creation and reclaiming of funds on their backend to simplify the front end flow for their users.
