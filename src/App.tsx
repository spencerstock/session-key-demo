import { useAccount, useConfig, useConnect, useDisconnect, useWalletClient } from "wagmi";
import { startPasskeyRegistration } from "./util/startPasskeyRegistration";
import { useState } from "react";
import { Hex, WalletClient, concat, hexToBytes, stringToHex, WalletGrantPermissionsReturnType, } from "viem";
import {
  bundlerClient,
  getUserOpHashForMint,
} from "./util/getUserOpHashForMint";
import { truncateMiddle } from "./util/truncateMiddle";
import { getAuthOptions } from "./util/getAuthOptions";
import { signUserOp } from "./util/signUserOp";
import { useQuery } from "@tanstack/react-query";
import { base58 } from "@scure/base";
import { sendCalls } from "viem/experimental";
import { baseSepolia } from "viem/chains";
import { connect } from "wagmi/actions";

function App() {
  const account = useAccount();
  const config = useConfig()
  const { connectors, status, error } = useConnect();
  const [permissionsContext, setPermissionsContext] = useState('')
  const { disconnect } = useDisconnect();
  const { data: walletClient } = useWalletClient({chainId: 84532});
  const [isSessionCreate, setIsSessionCreated] = useState(false);
  const [publicKey, setPublicKey] = useState<Hex | undefined>();
  const [credentialID, setCredentialID] = useState<string | undefined>();
  const [address, setAddress] = useState<Hex | undefined>();
  const [userOpHash, setUserOpHash] = useState<Hex>("0x");
  const [submitted, setSubmitted] = useState(false);
  const { data: userOpReceipt } = useQuery({
    queryKey: ["opReceipt", userOpHash],
    queryFn: () => bundlerClient.getUserOperationReceipt({ hash: userOpHash }),
    enabled: userOpHash !== "0x",
    refetchInterval: 1000,
  });

  const createSession = async () => {
    const response = await connect(config, {connector: connectors[0], requests: [
      { message: "Sign in" },
      {
        permissions: {
          expiry: 1577840461,
          chainId: 84532,
          signer: {
            type: "wallet",
          },
          permissions: [
            {
                required: true,
                type: "session-call",
                data: {},
                policies: [
                    {
                        type: "native-token-spend-limit",
                        data: {
                            value: "0x100",
                        },
                    }
                ]
            }
        ]
        },
      },
    ] })
    const context = (response.requestResponses.find(((request) => {
      return request instanceof Object && 'permissionsContext' in request
    })) as WalletGrantPermissionsReturnType).permissionsContext
    setPermissionsContext(context)
    // if (walletClient) {
    //   const { publicKey: newSigner, credentialID: newCredentialId } =
    //     await startPasskeyRegistration();
    //   // const [sessionAddress] = (await walletClient.request({
    //   //   method: "wallet_grantPermissions",
    //   //   params: {
    //   //     signer: { publicKey: newSigner, credentialId: newCredentialId },
    //   //   },
    //   // })) as [Hex];
    //   await walletClient.request({
    //     method: 'wallet_sendCalls',
    //     params: {
    //       requests: [
    //         {
    //           method: 'personal_sign',
    //           params: [stringToHex('Sign in')],
    //         },
    //         {
    //           method: 'wallet_grantPermissions',
    //           params: {
    //             signer: {
    //               type: 'key',
    //               data: {
    //                 id: newSigner,
    //               }
    //             },
    //             permissions: [
    //               {
    //                 type: 'compliance-function',
    //                 policies: [
    //                   {
    //                     type: 'native-token-transfer',
    //                     data: {
    //                       value: '0x100'
    //                     }
    //                   },
    //                   {
    //                     type: 'contract-call',
    //                     data: {
    //                       address: '0x...',
    //                       calls: ['function sessionCall(bytes calldata data) external']
    //                     }
    //                   },
    //                 ],
    //                 required: true,
    //               }
    //             ],
    //             expiry: 1577840461
    //           }
    //         }
    //       ]
    //     }
    //   })
    //   // setPublicKey(newSigner);
    //   // setCredentialID(newCredentialId);
    //   // setIsSessionCreated(true);
    //   // setAddress(sessionAddress);
    // }
  };

  const mint = async () => {
    if (account.address) {
      const id = await sendCalls(walletClient as WalletClient, {
        account: account.address,
        chain: baseSepolia,
        calls:[{
          to: '0x416EDD85FA37A3bE56b9fE95B996359B539dA1A3',
          value: 0n,
          data: '0x7bc361a300000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000044beebc5da0000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000'
        }],
        capabilities: {
          permissions: {
            context: permissionsContext
          }
        }
      })
    }
    // if (address && credentialID) {
    //   setSubmitted(true);
    //   const { hash, userOp } = await getUserOpHashForMint(address);
    //   const options = await getAuthOptions(hash, credentialID);
    //   const signature = await signUserOp(options, address);
    //   const userOpToSubmit = { ...userOp, signature };
    //   const submittedUserOpHash = await bundlerClient.sendUserOperation({
    //     userOperation: userOpToSubmit,
    //   });
    //   setUserOpHash(submittedUserOpHash);
    //   setSubmitted(false);
    // }
  };

  return (
    <div className="bg-blue-700 h-screen w-screen flex flex-col items-center justify-center text-white relative">
      <div className="absolute top-4 right-4">
        {account.address && <span className="text-lg">{truncateMiddle(account.address)}</span>}
        {!account.address && (
          <button
            className="bg-white text-black p-2 rounded-lg w-36 text-lg"
            onClick={createSession}
            type="button"
          >
            Log in
          </button>
        )}
      </div>

      <div className="div flex flex-col items-center justify-center space-y-8">
        {!account.address && <h2 className="text-xl">Session key demo</h2>}
        {account.address && (
          <>
            <button
              className="bg-white text-black p-2 rounded-lg w-36 text-lg disabled:bg-gray-400"
              type="button"
              onClick={mint}
              disabled={submitted}
            >
              Mint!
            </button>
            {userOpReceipt?.receipt.transactionHash && (
              <a
                href={`https://basescan.org/tx/${userOpReceipt.receipt.transactionHash}`}
                target="_blank"
                rel="noreferrer"
                className="text-text-white"
              >
                View transaction
              </a>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default App;
