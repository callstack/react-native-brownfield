### Gradle Profiler

Repo: https://github.com/gradle/gradle-profiler
Android docs: https://developer.android.com/build/profile-your-build

### Pre-Requisites
- Ensure gradle-profiler is installed, (instructions)[https://github.com/gradle/gradle-profiler#installing]
- Change your working directory to `RNApp/android/gradle-profiler`

### Steps:
- Checkout to main or baseline branch
- Adjust the scenarios to suit your use-case OR create a new scenarios file
- Run the following command:
```bash
gradle-profiler --benchmark --project-dir ../ --scenario-file ./scenarios.txt
```
- Once the run finishes, copy the items in `profile-out/benchmark.csv` to `benchmarks/old.txt` OR create a new file
- Checkout to the current branch
- Use the same scenarios from above and run the benchmark command
- Once the run finishes, copy the items in `profile-out/benchmark.csv` to `benchmarks/new.txt` OR create a new file

> [NOTE]
> Clear the `profile-out` folder before a next run, otherwise a new folder `profile-out2` will be created.
> The changes to scenarios.txt or new file creation, similarly under benchmarks folder, will required to be
> tracked to version control.
