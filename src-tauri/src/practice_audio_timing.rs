//! A true6/8 count bar; subdivision pulses never change metrical or score time.
pub fn pulse(time:f64,eighth:f64,subdivision:f64)->(f64,f64,f64){pulse_grid(time,eighth,subdivision,None)}
pub fn pulse_grid(time:f64,eighth:f64,subdivision:f64,grid:Option<&(u32,u32,Vec<u64>)>)->(f64,f64,f64){
 let cadence=if subdivision>0.0{subdivision}else{eighth};let index=(time/cadence).floor();let age=time-index*cadence;
 let ratio=(eighth/cadence).round()as u64;let metrical_index=index as u64/ratio;let intermediate=index as u64%ratio!=0;
 let (primary,secondary)=if let Some((p,offset,bars))=grid{
  if metrical_index<*offset as u64{(metrical_index==0,metrical_index%*p as u64==0)}
  else{let score=metrical_index-*offset as u64;(bars.binary_search(&score).is_ok(),score%*p as u64==0)}
 }else{(metrical_index%6==0,metrical_index%3==0)};
 let frequency=if intermediate{650.0}else if primary{1200.0}else if secondary{900.0}else{650.0};
 (age,frequency,if intermediate{0.064}else{0.16})
}
#[cfg(test)]mod tests{use super::pulse;
 #[test]fn subdivisions_preserve_full_bar_and_score_accent(){for bpm in [5.0,10.0,15.0,180.0]{let eighth=60.0/(bpm*3.0);let mut count=eighth;while count>1.0{count/=2.0;}let epsilon=0.00001;for i in 0..6{let(age,hz,amp)=pulse(i as f64*eighth+epsilon,eighth,count);assert!((age-epsilon).abs()<1e-8);assert_eq!(hz,if i==0{1200.0}else if i==3{900.0}else{650.0});assert_eq!(amp,0.16);}if count<eighth{assert_eq!(pulse(count+epsilon,eighth,count).2,0.064);}let(age,hz,amp)=pulse(6.0*eighth+epsilon,eighth,count);assert!((age-epsilon).abs()<1e-8);assert_eq!(hz,1200.0);assert_eq!(amp,0.16);if count<eighth{assert_eq!(pulse(6.0*eighth+count+epsilon,eighth,count).2,0.064);}}
 }
 #[test]fn test_click_has_no_count_in(){assert_eq!(pulse(0.0,1.0/9.0,0.0),(0.0,1200.0,0.16));}
}
