# Publishing a Signed Plugin

To publish a signed plugin (currently to `mavenLocal` only), you need to configure the signing key data in plugin's `gradle.properties` file

> [!IMPORTANT]
> Make sure to clear `~/.m2` directory before starting publishing process

### 1. Add Signing Key Data

Update `gradle.properties` file with the following properties:

```
signing.keyId=<key>
signing.password=<password>
signing.secretKeyRingFile=<path-to-gpg-file>
```

- `keyId`: The public key ID.
- `password`: The passphrase used when creating the key.
- `secretKeyRingFile`: The absolute path to the private key file.

### 2. Publish the Plugin

Once the signing key is set up correctly, run the following command:

```sh
yarn brownfield:plugin:publish:local:signed
```

### 3. Output

If everything is configured properly, the signed plugin will be published to the `~/.m2` repository.

### 4. Publishing

Go to `~/.m2/repository`, ZIP created plugin at `com` directory level (make sure there isn't any other plugin inside it) and upload it to [Maven Central](https://central.sonatype.com/)
