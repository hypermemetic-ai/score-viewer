// Hosted-runner QA only. This helper neither registers apps nor changes their bundles.
#import <AppKit/AppKit.h>
#import <CoreGraphics/CoreGraphics.h>
#import <libproc.h>
#import <sys/sysctl.h>
#import <unistd.h>
#import <signal.h>

static NSString *pathOf(NSURL *url) {
    return url ? url.URLByResolvingSymlinksInPath.standardizedURL.path : nil;
}

// C comparisons/logical expressions have integer type even when they denote a
// Boolean. Explicit singleton boxing keeps every receipt Boolean true/false.
static NSNumber *jsonBoolean(BOOL value) {
    return value ? @YES : @NO;
}

static BOOL isJSONBoolean(id value) {
    return [value isKindOfClass:NSNumber.class] &&
        CFGetTypeID((__bridge CFTypeRef)value) == CFBooleanGetTypeID();
}

static BOOL sameUserDesktopSession(NSDictionary *session, uid_t uid) {
    NSNumber *sessionUid = session[(__bridge NSString *)kCGSessionUserIDKey];
    return session && [sessionUid isKindOfClass:NSNumber.class] && sessionUid.unsignedIntValue == uid &&
        [session[(__bridge NSString *)kCGSessionOnConsoleKey] boolValue] &&
        [session[(__bridge NSString *)kCGSessionLoginDoneKey] boolValue];
}

typedef NS_ENUM(NSInteger, LaunchSurvivalTransition) {
    LaunchSurvivalWaiting, LaunchSurvivalUnexpectedExit, LaunchSurvivalReached
};

static LaunchSurvivalTransition survivalTransition(BOOL failed, BOOL survived, BOOL cleanupStarted,
    BOOL terminated, BOOL identityMatches, double elapsed, double survival) {
    if (failed || survived || cleanupStarted) return LaunchSurvivalWaiting;
    if (terminated) return LaunchSurvivalUnexpectedExit;
    if (identityMatches && elapsed >= survival) return LaunchSurvivalReached;
    return LaunchSurvivalWaiting;
}

static BOOL shouldForceCleanup(BOOL cleanupStarted, BOOL terminated, double elapsed, BOOL forced) {
    return cleanupStarted && !terminated && elapsed >= 3 && !forced;
}

static BOOL cleanupDeadlineExceeded(BOOL cleanupStarted, BOOL terminated, double elapsed) {
    return cleanupStarted && !terminated && elapsed >= 6;
}

static int sessionSelfTest(void) {
    NSString *uidKey = (__bridge NSString *)kCGSessionUserIDKey;
    NSString *consoleKey = (__bridge NSString *)kCGSessionOnConsoleKey;
    NSString *loginKey = (__bridge NSString *)kCGSessionLoginDoneKey;
    NSDictionary *valid = @{uidKey:@501, consoleKey:@YES, loginKey:@YES};
    NSMutableArray *checks = [NSMutableArray array];
    void (^check)(NSString *, NSDictionary *, uid_t, BOOL) = ^(NSString *name, NSDictionary *session, uid_t uid, BOOL expected) {
        BOOL actual = sameUserDesktopSession(session, uid);
        [checks addObject:@{@"case":name, @"actual":jsonBoolean(actual), @"expected":jsonBoolean(expected),
            @"passed":jsonBoolean(actual == expected)}];
    };
    check(@"same-user SDK keys", valid, 501, YES);
    check(@"nil dictionary", nil, 501, NO);
    check(@"empty dictionary", @{}, 501, NO);
    check(@"mismatched user", valid, 502, NO);
    NSMutableDictionary *variant = [valid mutableCopy]; [variant removeObjectForKey:uidKey];
    check(@"missing user including uid zero", variant, 0, NO);
    variant = [valid mutableCopy]; [variant removeObjectForKey:consoleKey]; check(@"missing console", variant, 501, NO);
    variant = [valid mutableCopy]; [variant removeObjectForKey:loginKey]; check(@"missing login", variant, 501, NO);
    variant = [valid mutableCopy]; variant[consoleKey] = @NO; check(@"off console", variant, 501, NO);
    variant = [valid mutableCopy]; variant[loginKey] = @NO; check(@"login incomplete", variant, 501, NO);
    variant = [valid mutableCopy]; variant[uidKey] = @"501"; check(@"nonnumeric user", variant, 501, NO);
    NSMutableArray *lifecycleChecks = [NSMutableArray array];
    void (^lifecycleCheck)(NSString *, BOOL, BOOL) = ^(NSString *name, BOOL actual, BOOL expected) {
        [lifecycleChecks addObject:@{@"case":name, @"actual":jsonBoolean(actual), @"expected":jsonBoolean(expected),
            @"passed":jsonBoolean(actual == expected)}];
    };
    lifecycleCheck(@"alive before survival deadline", survivalTransition(NO, NO, NO, NO, YES, 4.9, 5) == LaunchSurvivalWaiting, YES);
    lifecycleCheck(@"unexpected exit before survival deadline", survivalTransition(NO, NO, NO, YES, YES, 4.9, 5) == LaunchSurvivalUnexpectedExit, YES);
    lifecycleCheck(@"unexpected exit at survival deadline", survivalTransition(NO, NO, NO, YES, YES, 5, 5) == LaunchSurvivalUnexpectedExit, YES);
    BOOL survived = survivalTransition(NO, NO, NO, NO, YES, 5, 5) == LaunchSurvivalReached;
    lifecycleCheck(@"survival deadline reached", survived, YES);
    lifecycleCheck(@"identity not established", survivalTransition(NO, NO, NO, NO, NO, 5, 5) == LaunchSurvivalWaiting, YES);
    lifecycleCheck(@"existing launch error stays failed", survivalTransition(YES, NO, YES, YES, YES, 5, 5) == LaunchSurvivalWaiting, YES);
    lifecycleCheck(@"intentional exit after survival", survivalTransition(NO, survived, YES, YES, YES, 5.1, 5) == LaunchSurvivalWaiting, YES);
    lifecycleCheck(@"intentional exit during cleanup", survivalTransition(NO, NO, YES, YES, YES, 4.9, 5) == LaunchSurvivalWaiting, YES);
    lifecycleCheck(@"cleanup grace not reached", shouldForceCleanup(YES, NO, 2.9, NO), NO);
    lifecycleCheck(@"force cleanup after grace", shouldForceCleanup(YES, NO, 3, NO), YES);
    lifecycleCheck(@"cleanup not forced twice", shouldForceCleanup(YES, NO, 3, YES), NO);
    lifecycleCheck(@"finished cleanup not forced", shouldForceCleanup(YES, YES, 3, NO), NO);
    lifecycleCheck(@"cleanup deadline not reached", cleanupDeadlineExceeded(YES, NO, 5.9), NO);
    lifecycleCheck(@"cleanup deadline exceeded", cleanupDeadlineExceeded(YES, NO, 6), YES);
    lifecycleCheck(@"finished cleanup does not fail", cleanupDeadlineExceeded(YES, YES, 6), NO);
    lifecycleCheck(@"cleanup not started", shouldForceCleanup(NO, NO, 6, NO) || cleanupDeadlineExceeded(NO, NO, 6), NO);
    NSArray *allChecks = [checks arrayByAddingObjectsFromArray:lifecycleChecks];
    BOOL passed = YES; for (NSDictionary *result in allChecks) if (![result[@"passed"] boolValue]) passed = NO;
    NSDictionary *receipt = @{@"schema":@1, @"mode":@"CGSession SDK predicate self-test", @"status":passed ? @"passed" : @"failed",
        @"checks":checks, @"lifecycleChecks":lifecycleChecks};
    NSData *json = [NSJSONSerialization dataWithJSONObject:receipt options:0 error:NULL];
    NSDictionary *parsed = json ? [NSJSONSerialization JSONObjectWithData:json options:0 error:NULL] : nil;
    BOOL serializationPassed = [parsed[@"checks"] count] == checks.count && [parsed[@"lifecycleChecks"] count] == lifecycleChecks.count;
    for (NSDictionary *result in [parsed[@"checks"] arrayByAddingObjectsFromArray:parsed[@"lifecycleChecks"]]) {
        for (NSString *key in @[@"actual", @"expected", @"passed"]) {
            if (!isJSONBoolean(result[key])) serializationPassed = NO;
        }
        if ([result[@"actual"] boolValue] != [result[@"expected"] boolValue] || ![result[@"passed"] boolValue]) serializationPassed = NO;
    }
    // Both Boolean values must survive. Historical boxed comparisons must be
    // rejected even though NSNumber.boolValue would treat 1/0 identically.
    NSArray *samples = @[jsonBoolean(YES), jsonBoolean(NO), @(1 == 1), @(1 == 0)];
    NSData *sampleJson = [NSJSONSerialization dataWithJSONObject:samples options:0 error:NULL];
    NSArray *sampleReadback = sampleJson ? [NSJSONSerialization JSONObjectWithData:sampleJson options:0 error:NULL] : nil;
    if (sampleReadback.count != 4 || !isJSONBoolean(sampleReadback[0]) || ![sampleReadback[0] boolValue] ||
        !isJSONBoolean(sampleReadback[1]) || [sampleReadback[1] boolValue] ||
        isJSONBoolean(sampleReadback[2]) || isJSONBoolean(sampleReadback[3])) serializationPassed = NO;
    if (!serializationPassed) fprintf(stderr, "Native receipt Boolean JSON round-trip failed\n");
    puts([[NSString alloc] initWithData:json encoding:NSUTF8StringEncoding].UTF8String);
    return passed && serializationPassed ? 0 : 1;
}

// Read only this candidate's environment in memory. Never emit or retain it.
static BOOL ownsToken(pid_t pid, NSString *token) {
    int mib[] = {CTL_KERN, KERN_PROCARGS2, pid};
    size_t length = 0;
    if (sysctl(mib, 3, NULL, &length, NULL, 0) != 0 || length < sizeof(int) || length > 2 * 1024 * 1024) return NO;
    NSMutableData *bytes = [NSMutableData dataWithLength:length];
    if (sysctl(mib, 3, bytes.mutableBytes, &length, NULL, 0) != 0) return NO;
    const char *p = bytes.bytes, *end = p + length;
    int argc = 0; memcpy(&argc, p, sizeof(argc)); p += sizeof(argc);
    if (argc < 0 || argc > 65536) return NO;
    while (p < end && *p) p++; // executable path
    while (p < end && !*p) p++;
    for (int i = 0; i < argc; i++) {
        size_t size = strnlen(p, (size_t)(end - p));
        if (p + size >= end) return NO;
        p += size + 1;
    }
    NSData *expected = [[@"ISO_SCORE_VIEWER_CI_LAUNCH_TOKEN=" stringByAppendingString:token] dataUsingEncoding:NSUTF8StringEncoding];
    while (p < end && *p) {
        size_t size = strnlen(p, (size_t)(end - p));
        if (p + size >= end) return NO;
        if (size == expected.length && memcmp(p, expected.bytes, size) == 0) return YES;
        p += size + 1;
    }
    return NO;
}

int main(int argc, const char *argv[]) {
    @autoreleasepool {
        if (argc == 2 && strcmp(argv[1], "--self-test") == 0) return sessionSelfTest();
        if (argc != 6) { fprintf(stderr, "Expected app, executable, uid, survival ms, launch timeout ms\n"); return 2; }
        NSURL *bundle = [NSURL fileURLWithPath:@(argv[1]) isDirectory:YES];
        NSString *bundlePath = pathOf(bundle), *executablePath = pathOf([NSURL fileURLWithPath:@(argv[2])]);
        uid_t uid = (uid_t)strtoul(argv[3], NULL, 10);
        double survival = strtod(argv[4], NULL) / 1000.0, launchTimeout = strtod(argv[5], NULL) / 1000.0;
        if (uid != geteuid() || survival < 1 || survival > 10 || launchTimeout < 1 || launchTimeout > 20) return 2;
        NSMutableDictionary *receipt = [@{@"schema":@1, @"launchApi":@"NSWorkspace.openApplication", @"uid":@(uid),
            @"bundlePath":bundlePath, @"executablePath":executablePath, @"callbackReceived":@NO,
            @"sameUserDesktop":@NO, @"returnedIdentityMatches":@NO} mutableCopy];
        NSDictionary *session = CFBridgingRelease(CGSessionCopyCurrentDictionary());
        BOOL sameUserDesktop = sameUserDesktopSession(session, uid);
        receipt[@"sameUserDesktop"] = jsonBoolean(sameUserDesktop);
        NSNumber *sessionUid = session[(__bridge NSString *)kCGSessionUserIDKey];
        receipt[@"session"] = @{@"dictionaryPresent":jsonBoolean(session != nil),
            @"returnedSessionUid":[sessionUid isKindOfClass:NSNumber.class] ? sessionUid : NSNull.null,
            @"onConsole":jsonBoolean([session[(__bridge NSString *)kCGSessionOnConsoleKey] boolValue]),
            @"loginDone":jsonBoolean([session[(__bridge NSString *)kCGSessionLoginDoneKey] boolValue])};
        NSWorkspace *workspace = NSWorkspace.sharedWorkspace;
        NSString *bundleIdentifier = [NSBundle bundleWithURL:bundle].bundleIdentifier;
        NSString *unavailable = !sameUserDesktop ? @"Caller has no logged-in same-user Quartz console session" : nil;
        NSMutableSet<NSNumber *> *existing = [NSMutableSet set];
        for (NSRunningApplication *app in workspace.runningApplications) {
            [existing addObject:@(app.processIdentifier)];
            if ([pathOf(app.bundleURL) isEqual:bundlePath] || [pathOf(app.executableURL) isEqual:executablePath] ||
                (bundleIdentifier && [app.bundleIdentifier isEqual:bundleIdentifier])) unavailable = @"An existing viewer instance is running; it was preserved";
        }
        if (unavailable) {
            receipt[@"status"] = @"unavailable"; receipt[@"reason"] = unavailable;
            puts([[NSString alloc] initWithData:[NSJSONSerialization dataWithJSONObject:receipt options:0 error:NULL] encoding:NSUTF8StringEncoding].UTF8String);
            return 0;
        }
        if (!bundleIdentifier || ![executablePath hasPrefix:[bundlePath stringByAppendingString:@"/Contents/MacOS/"]]) return 2;
        NSString *token = NSUUID.UUID.UUIDString;
        __block NSRunningApplication *owned = nil;
        __block BOOL callbackReceived = NO, returnedIdentityMatches = NO, interrupted = NO;
        __block NSString *failure = nil;
        __block double readyAt = 0;
        BOOL (^matches)(NSRunningApplication *) = ^BOOL(NSRunningApplication *app) {
            if (!app || app.processIdentifier <= 0 || [existing containsObject:@(app.processIdentifier)]) return NO;
            char actual[PROC_PIDPATHINFO_MAXSIZE];
            return [pathOf(app.bundleURL) isEqual:bundlePath] && [pathOf(app.executableURL) isEqual:executablePath] &&
                proc_pidpath(app.processIdentifier, actual, sizeof(actual)) > 0 &&
                [pathOf([NSURL fileURLWithPath:@(actual)]) isEqual:executablePath];
        };
        void (^observe)(NSRunningApplication *) = ^(NSRunningApplication *app) {
            if (matches(app) && ownsToken(app.processIdentifier, token)) {
                if (owned && owned.processIdentifier != app.processIdentifier) failure = @"More than one owned launch instance appeared";
                else { owned = app; receipt[@"ownershipTokenMatched"] = @YES; }
            }
        };
        id observer = [workspace.notificationCenter addObserverForName:NSWorkspaceDidLaunchApplicationNotification object:nil queue:NSOperationQueue.mainQueue usingBlock:^(NSNotification *note) {
            observe(note.userInfo[NSWorkspaceApplicationKey]);
        }];
        signal(SIGTERM, SIG_IGN);
        dispatch_source_t termination = dispatch_source_create(DISPATCH_SOURCE_TYPE_SIGNAL, SIGTERM, 0, dispatch_get_main_queue());
        dispatch_source_set_event_handler(termination, ^{ interrupted = YES; });
        dispatch_resume(termination);
        NSWorkspaceOpenConfiguration *configuration = NSWorkspaceOpenConfiguration.configuration;
        configuration.createsNewApplicationInstance = YES;
        configuration.allowsRunningApplicationSubstitution = NO;
        configuration.addsToRecentItems = NO;
        configuration.promptsUserIfNeeded = NO;
        configuration.environment = @{@"ISO_SCORE_VIEWER_CI_LAUNCH_TOKEN":token};
        double began = NSProcessInfo.processInfo.systemUptime;
        [workspace openApplicationAtURL:bundle configuration:configuration completionHandler:^(NSRunningApplication *app, NSError *error) {
            dispatch_async(dispatch_get_main_queue(), ^{
                callbackReceived = YES;
                if (error) { failure = [NSString stringWithFormat:@"%@: %ld: %@", error.domain, (long)error.code, error.localizedDescription]; return; }
                if (!matches(app) || (owned && owned.processIdentifier != app.processIdentifier)) { failure = @"Returned application is not the exact new verified instance"; return; }
                owned = app; returnedIdentityMatches = YES; readyAt = NSProcessInfo.processInfo.systemUptime;
                receipt[@"returnedPid"] = @(app.processIdentifier);
                receipt[@"returnedBundlePath"] = pathOf(app.bundleURL);
                receipt[@"returnedExecutablePath"] = pathOf(app.executableURL);
            });
        }];
        double cleanupAt = 0;
        BOOL forced = NO, survived = NO;
        while (YES) {
            [[NSRunLoop currentRunLoop] runUntilDate:[NSDate dateWithTimeIntervalSinceNow:0.1]];
            double now = NSProcessInfo.processInfo.systemUptime;
            // Also cover a launch notification delivered before its completion callback.
            for (NSRunningApplication *app in workspace.runningApplications) observe(app);
            if (interrupted && !failure) failure = @"Launch helper interrupted; owned cleanup required";
            if (!callbackReceived && now - began >= launchTimeout && !failure) failure = @"Launch Services completion timed out";
            LaunchSurvivalTransition transition = survivalTransition(failure != nil, survived, cleanupAt != 0,
                owned.isTerminated, returnedIdentityMatches, now - readyAt, survival);
            if (transition == LaunchSurvivalUnexpectedExit) failure = @"Application exited during normal launch survival check";
            if (transition == LaunchSurvivalReached) survived = YES;
            if ((failure || survived) && owned && !cleanupAt) { cleanupAt = now; [owned terminate]; }
            if (shouldForceCleanup(cleanupAt != 0, owned.isTerminated, now - cleanupAt, forced)) { forced = YES; [owned forceTerminate]; }
            if (cleanupDeadlineExceeded(cleanupAt != 0, owned.isTerminated, now - cleanupAt)) { failure = @"Owned application termination could not be established"; break; }
            if (callbackReceived && (failure || survived) && (!owned || owned.isTerminated)) break;
            // Drain a late completion for five seconds after the launch deadline.
            // Unresolved requests fail explicitly; they can never produce acceptance.
            if (!callbackReceived && now - began >= launchTimeout + 5 && (!owned || owned.isTerminated)) break;
        }
        [workspace.notificationCenter removeObserver:observer];
        dispatch_source_cancel(termination);
        receipt[@"callbackReceived"] = jsonBoolean(callbackReceived);
        receipt[@"returnedIdentityMatches"] = jsonBoolean(returnedIdentityMatches);
        receipt[@"survivalMs"] = @(survived ? (NSInteger)(survival * 1000) : 0);
        receipt[@"cleanup"] = @{@"terminated":jsonBoolean(owned && owned.isTerminated),
            @"requestResolved":jsonBoolean(callbackReceived), @"forced":jsonBoolean(forced)};
        if (owned) receipt[@"pid"] = @(owned.processIdentifier);
        BOOL passed = survived && !failure && callbackReceived && returnedIdentityMatches && owned.isTerminated;
        receipt[@"status"] = passed ? @"passed" : @"failed";
        if (!passed) receipt[@"reason"] = failure ?: @"Launch request or owned cleanup remained unresolved";
        puts([[NSString alloc] initWithData:[NSJSONSerialization dataWithJSONObject:receipt options:0 error:NULL] encoding:NSUTF8StringEncoding].UTF8String);
        return passed ? 0 : 1;
    }
}
