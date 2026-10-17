/** A generic accepted personal change, driven through the production
 * memory/editor/painting path. The application's only generic caller was the
 * retired calculated-version selector; these harnesses keep using the same
 * steps to exercise intent ordering of the live painting path. Plain script:
 * it runs in the harness VM context beside the extracted production code. */
export const GENERIC_PERSONAL_COMMIT=`
async function commitPersonal(target,change){
 if(personalEditor(target).recovering)throw Error('Personal edit recovery is already running.');if(personalMemory.error)throw personalMemory.error;if(personalEditor(target).queue.error)throw personalEditor(target).queue.error;
 const next=readPersonal(change(rawMemoryPersonal(target.personal)),target.package);
 const saved=personalMemory.updatePersonal(memoryInput(target),change);
 await presentPersonalChange(target,next,saved);await saved;
}
`;
