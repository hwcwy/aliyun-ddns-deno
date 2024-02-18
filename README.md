# Aliyun-DDNS-Deno

Simple DDNS library of Deno , which I'm using myself.

## My own real-life example

```typescript
import { DDns } from "./mod.ts";
import { Config, IPType } from "./mod.ts";

const config: Config = {
  auth: {
    accessKeyId: "my secret",
    accessKeySecret: "my secret",
  },
  domains: [{
    name: "a.com", 
    RRs: [
      {
        name: "test",   // For test.a.com
        type: IPType.V4,
        ip: ip("wan"),
      },
    ],
  }],
  logger: {
    path: "./log",
    rotate: true,
    maxBytes: 10 * 1024 * 1024,
    maxBackupCount: 30,
  },
};

await new DDns(config).exec();

function ip(i: string) {
  const decoder = new TextDecoder();
  const res = new Deno.Command("sshpass", { // I'm using openwrt as my router so I can easily get ip
    args: [
      "-p",
      "password",
      "ssh",
      "root@192.168.10.1",
      "-p",
      "233",
      "ubus",
      "call",
      `network.interface.${i}`,
      "status",
    ],
  });
  const out = res.outputSync();
  const json = JSON.parse(decoder.decode(out.stdout));
  const ip = json["ipv4-address"][0].address;
  return ip;
}


```
