# Updating Actioner

## Pull Latest Changes

```bash
cd Aegis
git pull
npm install
npm run build
```

Restart the service if running:
```bash
launchctl kickstart -k gui/$(id -u)/com.nanoclaw
```

## Rebuilding the Container

If the agent-runner or container skills changed, rebuild the container image:

```bash
./container/build.sh
```

Then restart the service to pick up the new image.
