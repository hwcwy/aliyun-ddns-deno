import Alidns20150109, * as $Alidns20150109 from "npm:@alicloud/alidns20150109@3.4.0";
import * as $OpenApi from "npm:@alicloud/openapi-client@0.4.10";
import Logger from "jsr:@deno-lib/logger@1.1.6";

export type Config = {
  auth: {
    accessKeyId: string;
    accessKeySecret: string;
  };
  domains: Domain[];
  logger?: {
    path: string;
    rotate: boolean;
    maxBytes: number;
    maxBackupCount: number;
  };
};

export enum IPType {
  V4 = "A",
  V6 = "AAAA",
}

type Domain = {
  name: string;
  RRs: RR[];
};

type RR = {
  name: string;
  type: IPType;
  ip: string;
};

type Records =
  Alidns20150109.DescribeDomainRecordsResponseBodyDomainRecordsRecord[];

const logger = new Logger();
let loggerInit = false;

export class DDns {
  private client;
  private domains;
  private RecordIDTable;
  constructor(config: Config) {
    this.client = new Alidns20150109.default(new $OpenApi.Config(config.auth));
    this.domains = config.domains;
    this.RecordIDTable = new Map();
    if (config.logger && !loggerInit) {
      const { path, ...rest } = config.logger;
      logger.initFileLogger(path, rest);
      loggerInit = true;
    }
  }

  async exec() {
    for (const { name: domainName, RRs } of this.domains) {
      const records = await this.getRecords(domainName);

      if (!records) {
        logger.error(`未获取到 ${domainName} 的解析记录`);
        continue;
      }

      for (const { name, type, ip } of RRs) {
        const res = this.getRecordInfo(records, name);
        if (!res) {
          logger.error(
            `${domainName} 的解析记录中未发现 ${name}.${domainName}`,
          );
          continue;
        }
        const { recordId, value } = res;
        const ipAddr = ip;
        if (ipAddr !== value) {
          await this.updateRecord(name, recordId!, type, ipAddr);
          logger.info(`${name + "." + domainName} : ${value} -> ${ipAddr}`);
        } else {
          console.log(`${name + "." + domainName} : IP未改变 -> ${ipAddr}`);
        }
      }
    }
  }

  private getRecordInfo(
    records: Records,
    RR: string,
  ) {
    for (const { RR: rRR, recordId, value } of records) {
      if (RR === rRR && !this.RecordIDTable.has(recordId)) {
        this.RecordIDTable.set(recordId, true);
        return { recordId, value };
      }
    }
  }

  private async getRecords(domainName: string) {
    const request = new $Alidns20150109.DescribeDomainRecordsRequest({
      domainName,
    });

    const record = (await this.client.describeDomainRecords(
      request,
    )).body?.domainRecords?.record;

    return record;
  }

  private async updateRecord(
    RR: string,
    recordId: string,
    type: IPType,
    ip: string,
  ) {
    const request = new $Alidns20150109.UpdateDomainRecordRequest({
      RR,
      recordId,
      type,
      value: ip,
    });
    await this.client.updateDomainRecord(request).catch(logger.error);
  }
}
