# TODO

# feature changes
- we should say that the job name must be unique
- it is hard to run this locally because all of the dependencies take forever to install and there are no
instructions for how to do it
- shouldn't install node at runtime
- training job doesn't use the right env, uses DSE
- how to deal with transient errors in training jobs, which resulted in the job failing?
- how is local development? requirements would get out of sync with the environment, maybe we should download the 
requirements from the github repo when building the Dockerfile
- DOMINO_TRAINING_HARDWARE_TIER_NAME, DOMINO_EDA_HARDWARE_TIER_NAME not used
- i think job config should show what environment and hwt will be used for the job
- make training job stateless so that doesn't depend on shared sqlitedb OR programmatically share the dataset and then mount it in the user's project.....idk
- information in the extension-design.md makes assumptions about the file paths used, and should probably be generalized

# dockerfile changes
- verify numpy removal
- verify model serving requirements removal
- test doing eda with dataset
- test making registered model with job

# dev
- It seems that we use a sqlitedb shared dataset in order to share state between the extension and the target project
- there is an active domino jobs setting...probably useful for the in memory "jobs", for domino jobs though?
- job creation in sqlite db can fail and result in inconsistent state between domino and local db, job_service.py,
need to verify that test_job_service covers this for create_job_with_context
- test advanced configuration in job launching
