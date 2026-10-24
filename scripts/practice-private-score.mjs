/** The read-only private archive a practice check may add, by path: PRACTICE_PRIVATE_SCORE,
 * or the earlier PRACTICE_ZELDA, still read so existing setups keep their private checks. */
export function practicePrivateScore(env=process.env){
  if(env.PRACTICE_PRIVATE_SCORE)return env.PRACTICE_PRIVATE_SCORE;
  if(env.PRACTICE_ZELDA){console.warn('PRACTICE_ZELDA is deprecated; set PRACTICE_PRIVATE_SCORE instead.');return env.PRACTICE_ZELDA;}
}
