# TODO

# feature changes

## big problems
- make training job stateless so that doesn't depend on shared sqlitedb OR programmatically share the dataset and then mount it in the user's project.....idk
- make training job stateless so no env vars required in target project

## solvable problems
- DOMINO_TRAINING_HARDWARE_TIER_NAME, DOMINO_EDA_HARDWARE_TIER_NAME not used

## other
- we should say that the job name must be unique
- it is hard to run this locally because all of the dependencies take forever to install and there are no
instructions for how to do it
- how to deal with transient errors in training jobs, which resulted in the job failing?
- how is local development? requirements would get out of sync with the environment, maybe we should download the 
requirements from the github repo when building the Dockerfile
- i think job config should show what environment and hwt will be used for the job, also project target and user
- information in the extension-design.md makes assumptions about the file paths used, and should probably be generalized

# dockerfile changes
- verify numpy removal
- test doing eda with dataset
- test making registered model with job

# notes

## big problems
- we use a sqlitedb shared dataset in order to share state between the extension and the target project,
which requires the dataset to be shared with the target project/user and it is not possible to share with all users automatically
- the user must set env vars in their project in order to use the extension in it

## solvable problems
- apt is still available and usable in the app

## other
- there is an active domino jobs setting...probably useful for the in memory "jobs", for domino jobs though?
- test advanced configuration in job launching
- job creation in sqlite db can fail and result in inconsistent state between domino and local db, job_service.py,
need to verify that test_job_service covers this for create_job_with_context

