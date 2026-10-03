// jStat ships without TypeScript types. This declares only the parts the app uses.
declare module "jstat" {
  const jStat: {
    normal: {
      pdf(x: number, mean: number, sd: number): number;
      cdf(x: number, mean: number, sd: number): number;
    };
    chisquare: {
      pdf(x: number, df: number): number;
      cdf(x: number, df: number): number;
    };
    studentt: {
      pdf(x: number, df: number): number;
      cdf(x: number, df: number): number;
    };
  };
  export default jStat;
}
