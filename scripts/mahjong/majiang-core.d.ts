declare module '@kobalab/majiang-core' {
  export class Shoupai {
    static fromString(str: string): Shoupai;
    // その他のメソッドや型定義
  }
  export namespace Util {
    function xiangting(shoupai: Shoupai): number;
    function tingpai(shoupai: Shoupai): string[];
    function hule(
      shoupai: Shoupai,
      zimo: string | null,
      huleParam: ReturnType<typeof hule_param>
    ): any;
    function hule_param(options: {
      zhuangfeng: number;
      menfeng: number;
      lizhi:      number,
      yifa:       boolean,
      qianggang:  boolean,
      lingshang:  boolean,
      haidi:      number,
      tianhu:     number
      baopai: string[],
      fubaopai: string[] | null,
      changbang: number,
      lizhibang: number,
    }): {
      zhuangfeng: number;
      menfeng: number;
      lizhi:      number,
      yifa:       boolean,
      qianggang:  boolean,
      lingshang:  boolean,
      haidi:      number,
      tianhu:     number
      baopai: string[],
      fubaopai: string[] | null,
      changbang: number,
      lizhibang: number,
    };
  }
  // その他のクラスや型定義
}