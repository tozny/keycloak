package org.keycloak.quarkus.runtime.configuration.mappers;

final class HostnamePropertyMappers {

        private HostnamePropertyMappers() {
        }

        public static PropertyMapper[] getHostnamePropertyMappers() {
                return new PropertyMapper[] {
                                builder().from("hostname")
                                                .to("kc.spi.hostname.default.hostname")
                                                .description("Hostname for the Keycloak server.")
                                                .paramLabel("hostname")
                                                .build(),
                                fromOption(HostnameOptions.HOSTNAME_URL)
                                                .to("kc.spi-hostname-default-hostname-url")
                                                .paramLabel("url")
                                                .build(),
                                fromOption(HostnameOptions.HOSTNAME_ADMIN)
                                                .to("kc.spi-hostname-default-admin")
                                                .paramLabel("hostname")
                                                .build(),
                                fromOption(HostnameOptions.HOSTNAME_ADMIN_URL)
                                                .to("kc.spi-hostname-default-admin-url")
                                                .paramLabel("url")
                                                .build(),
                                fromOption(HostnameOptions.HOSTNAME_STRICT)
                                                .to("kc.spi-hostname-default-strict")
                                                .build(),
                                builder().from("hostname.strict-https")
                                                .to("kc.spi.hostname.default.strict-https")
                                                .description("Forces URLs to use HTTPS. Only needed if proxy does not properly set the X-Forwarded-Proto header.")
                                                .hidden(true)
                                                .defaultValue(Boolean.TRUE.toString())
                                                .type(Boolean.class)
                                                .build(),
                                builder().from("hostname.strict-backchannel")
                                                .to("kc.spi.hostname.default.strict-backchannel")
                                                .description("By default backchannel URLs are dynamically resolved from request headers to allow internal an external applications. If all applications use the public URL this option should be enabled.")
                                                .type(Boolean.class)
                                                .build(),
                                builder().from("hostname.path")
                                                .to("kc.spi.hostname.default.path")
                                                .description("This should be set if proxy uses a different context-path for Keycloak.")
                                                .paramLabel("path")
                                                .build()
                };
        }

        private static PropertyMapper.Builder builder() {
                return PropertyMapper.builder(ConfigCategory.HOSTNAME);
        }
}
