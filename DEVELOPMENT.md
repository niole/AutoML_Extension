# TODO

# feature changes
- shouldn't install node at runtime
- training job doesn't use the right env, uses DSE
- how to deal with transient errors in training jobs, which resulted in the job failing?
<<<<<<< Updated upstream
=======
- how is local development? requirements would get out of sync with the environment, maybe we should download the 
requirements from the github repo when building the Dockerfile
- DOMINO_TRAINING_HARDWARE_TIER_NAME, DOMINO_EDA_HARDWARE_TIER_NAME not used
- i think job config should show what environment and hwt will be used for the job
>>>>>>> Stashed changes

# dockerfile changes
- verify numpy removal
- verify model serving requirements removal
- test doing eda with dataset
- test making registered model with job

# dev
- understand how jobs are launched
- there is an active domino jobs setting...probably useful for the in memory "jobs", for domino jobs though?
- job creation in sqlite db can fail and result in inconsistent state between domino and local db, job_service.py,
need to verify that test_job_service covers this for create_job_with_context
- does the code that launches the job use the right env?
- test advanced configuration in job launching
- if you recreate the extension, the sqlitedb data goes missing...maybe there is a required setup step so that we ensure
the app uses a domino dataset


