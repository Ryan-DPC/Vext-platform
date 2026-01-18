# Vext Game Integration Standard

This document outlines the standard protocol for integrating game clients (Unity, Unreal Engine, Godot) with the Vext Launcher.

## 🔗 Interface Protocol

The Vext Launcher launches games as child processes, passing authentication and session data via **Command Line Arguments**.

### CLI Arguments

| Argument | Description | Example |
| :--- | :--- | :--- |
| `--vext-user-id` | The format `Username` or `Username#1234`. | `"Ryand"` |
| `--vext-token` | The JWT used for Backend/Socket authentication. | `"eyJhbGci..."` |
| `--vext-friends` | (Optional) Initial friends list snapshot. | `"Max:online,Paul:offline"` |
| `--vext-gateway` | (Optional) WebSocket Gateway URL. | `"wss://api.vext.gg"` |

---

## 🛠️ Unity Integration (C#)

In Unity, use `System.Environment.GetCommandLineArgs()` to parse the arguments in your initialization script.

```csharp
using UnityEngine;
using System.Linq;

public class VextInit : MonoBehaviour
{
    public string Username;
    public string Token;

    void Start()
    {
        string[] args = System.Environment.GetCommandLineArgs();
        
        for (int i = 0; i < args.Length; i++)
        {
            if (args[i] == "--vext-user-id" && i + 1 < args.Length)
            {
                Username = args[i + 1];
            }
            else if (args[i] == "--vext-token" && i + 1 < args.Length)
            {
                Token = args[i + 1];
            }
        }

        if (string.IsNullOrEmpty(Token))
        {
            Debug.LogWarning("⚠️ No VEXT Token found. Running in Offline/Dev Mode.");
        }
        else
        {
            Debug.Log($"✅ Logged in as {Username}");
            // Initialize your NetworkManager here with the Token
        }
    }
}
```

---

## 🎮 Unreal Engine Integration (C++)

In Unreal, use `FCommandLine::Parse` in your GameInstance or GameMode `Init`.

```cpp
#include "VextGameInstance.h"
#include "Misc/CommandLine.h"

void UVextGameInstance::Init()
{
    Super::Init();

    FString VextToken;
    FString VextUser;

    // Parse CLI Arguments
    if (FParse::Value(FCommandLine::Get(), TEXT("vext-token"), VextToken))
    {
        VextToken = VextToken.Replace(TEXT("="), TEXT("")); // Clean up if needed
        this->AuthToken = VextToken;
    }

    if (FParse::Value(FCommandLine::Get(), TEXT("vext-user-id"), VextUser))
    {
        this->Username = VextUser;
    }

    UE_LOG(LogTemp, Log, TEXT("VEXT Login: %s"), *this->Username);
}
```

### Blueprint Alternative
Use the **"Get Command Line"** node and a string parsing library, but C++ is recommended for robustness.

---

## 🤖 Godot Integration (GDScript)

In Godot, use `OS.get_cmdline_args()` in your main script `_ready()`.

```gdscript
extends Node

var vext_token = ""
var vext_username = "Guest"

func _ready():
    var args = OS.get_cmdline_args()
    
    for i in range(args.size()):
        if args[i] == "--vext-token" and i + 1 < args.size():
            vext_token = args[i+1]
        elif args[i] == "--vext-user-id" and i + 1 < args.size():
            vext_username = args[i+1]
            
    if vext_token != "":
        print("✅ Vext Login: ", vext_username)
        _connect_websocket(vext_token)
    else:
        push_warning("⚠️ No Vext Token provided")

func _connect_websocket(token):
    # Setup your WebSocketClient with the token
    pass
```
