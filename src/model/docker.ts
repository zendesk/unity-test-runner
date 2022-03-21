import { existsSync, mkdirSync } from 'fs';
import ImageTag from './image-tag';
import { exec } from '@actions/exec';
import path from 'path';

const Docker = {
  async build(buildParameters, silent = false) {
    const { path: buildPath, dockerfile, baseImage } = buildParameters;
    const { version } = baseImage;

    const tag = new ImageTag({ version });
    const command = `docker build ${buildPath} \
      --file ${dockerfile} \
      --build-arg IMAGE=${baseImage} \
      --tag ${tag}`;

    await exec(command, undefined, { silent });

    return tag;
  },

  async run(image, parameters, silent = false) {
    const {
      unityVersion,
      workspace,
      projectPath,
      customParameters,
      testMode,
      artifactsPath,
      useHostNetwork,
      sshAgent,
      gitPrivateToken,
      githubToken,
      runnerTempPath,
    } = parameters;

    const githubHome = path.join(runnerTempPath, '_github_home');
    if (!existsSync(githubHome)) mkdirSync(githubHome);
    const githubWorkflow = path.join(runnerTempPath, '_github_workflow');
    if (!existsSync(githubWorkflow)) mkdirSync(githubWorkflow);

    const command = `docker run \
        --workdir /github/workspace \
        --rm \
        --env UNITY_LICENSE \
        --env UNITY_LICENSE_FILE \
        --env UNITY_EMAIL \
        --env UNITY_PASSWORD \
        --env UNITY_SERIAL \
        --env UNITY_VERSION="${unityVersion}" \
        --env PROJECT_PATH="${projectPath}" \
        --env CUSTOM_PARAMETERS="${customParameters}" \
        --env TEST_MODE="${testMode}" \
        --env ARTIFACTS_PATH="${artifactsPath}" \
        --env GITHUB_REF \
        --env GITHUB_SHA \
        --env GITHUB_REPOSITORY \
        --env GITHUB_ACTOR \
        --env GITHUB_WORKFLOW \
        --env GITHUB_HEAD_REF \
        --env GITHUB_BASE_REF \
        --env GITHUB_EVENT_NAME \
        --env GITHUB_WORKSPACE=/github/workspace \
        --env GITHUB_ACTION \
        --env GITHUB_EVENT_PATH \
        --env RUNNER_OS \
        --env RUNNER_TOOL_CACHE \
        --env RUNNER_TEMP \
        --env RUNNER_WORKSPACE \
        --env GIT_PRIVATE_TOKEN="${gitPrivateToken}" \
        ${sshAgent ? '--env SSH_AUTH_SOCK=/ssh-agent' : ''} \
        --volume "/var/run/docker.sock":"/var/run/docker.sock:z" \
        --volume "${githubHome}":"/root:z" \
        --volume "${githubWorkflow}":"/github/workflow:z" \
        --volume "${workspace}":"/github/workspace:z" \
        ${sshAgent ? `--volume ${sshAgent}:/ssh-agent` : ''} \
        ${sshAgent ? '--volume /home/runner/.ssh/known_hosts:/root/.ssh/known_hosts:ro' : ''} \
        ${useHostNetwork ? '--net=host' : ''} \
        ${githubToken ? '--env USE_EXIT_CODE=false' : '--env USE_EXIT_CODE=true'} \
        ${image}`;

    await exec(command, undefined, { silent });
  },
};

export default Docker;