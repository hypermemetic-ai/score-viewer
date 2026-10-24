/** The read-only private archive a practice check may add, by path: PRACTICE_PRIVATE_SCORE. */
export function practicePrivateScore(env=process.env){
  return env.PRACTICE_PRIVATE_SCORE||undefined;
}
